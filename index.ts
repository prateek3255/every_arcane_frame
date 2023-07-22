import ffmpeg from "fluent-ffmpeg";
import dotenv from "dotenv";
import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import { createClient } from "@supabase/supabase-js";
import { TwitterApi as TwitterClientV2 } from "twitter-api-v2";
// import { generateTimestamps } from "./generateTimestamps";

dotenv.config();

const twitterClient = new TwitterClientV2({
  appKey: process.env.TWITTER_API_KEY ?? "",
  appSecret: process.env.TWITTER_API_SECRET ?? "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_TOKEN ?? ""
);

interface RandomRow {
  id: number;
  position: number;
  episodes: {
    title: string;
    link: string;
  };
}

const fetchRandomRow = async () => {
  // Query for creating the random timestamps view:
  // create view random_timestamps as select * from timestamps order by random()
  const { data, error } = await supabase
    .from<RandomRow>("random_timestamps")
    .select(
      `
      id,
      position,
      episodes (
        title,
        link
      )
    `
    )
    .limit(1)
    .single();
  if (error || !data) {
    console.log(error);
    throw error;
  }
  console.log(
    `Random timestamp row title ${data.episodes.title} - ${data.position}`
  );
  return data;
};

const takeScreenshotAndSaveImage = (timestamp: number, episodeURL: string) => {
  return new Promise((resolve, reject) => {
    new ffmpeg(episodeURL)
      .takeScreenshots({
        count: 1,
        timemarks: [`${timestamp}`],
        filename: "screenshot",
      })
      .on("end", function () {
        console.log("Screenshot taken");
        resolve(null);
      })
      .on("error", function (err) {
        console.log("An error occurred: " + err.message);
        reject(err);
      });
  });
};

const tweetImage = async () => {
  const mediaId = await twitterClient.v1.uploadMedia('./screenshot.png');
  console.log("Uploaded image to Twitter");
  const tweetData = await twitterClient.v2.tweet({
    text: "",
    media: {
      media_ids: [mediaId],
    },
  });
  if (tweetData.errors) {
    console.log(tweetData.errors);
    throw JSON.stringify(tweetData.errors);
  }
  console.log("Tweeted image");
  return tweetData;
};

const removeRowFromDatabase = async (id: number) => {
  const { error } = await supabase.from("timestamps").delete().match({ id });
  if (error) {
    console.log(error);
    throw error;
  }
  console.log("Removed row from database");
};

const compressImage = async () => {
  await imagemin(["./screenshot.png"], {
    destination: "./",
    plugins: [imageminPngquant()],
  });
  console.log("Compressed png");
};

const prependZeroIfSingleDigit = (number: number) => {
  return ("0" + number).slice(-2);
};

const replyToTweet = async ({
  tweetId,
  episodeTitle,
  position,
}: {
  tweetId: string;
  episodeTitle: string;
  position: number;
}) => {
  const timestamp = `${prependZeroIfSingleDigit(
    Math.floor(position / 60)
  )}:${prependZeroIfSingleDigit(position % 60)}`;
  const reply = `${episodeTitle} [${timestamp}] #arcane`;
  await twitterClient.v2.reply(`@arcane_frames ${reply}`, tweetId);
  console.log(`Replied to tweet - ${reply}`);
};

const screenshotAndTweet = async () => {
  try {
    const data = await fetchRandomRow();
    await takeScreenshotAndSaveImage(data.position, data.episodes.link);
    await compressImage();
    const tweetData = await tweetImage();
    await removeRowFromDatabase(data.id);
    await replyToTweet({
      tweetId: tweetData.data.id,
      episodeTitle: data.episodes.title,
      position: data.position,
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

screenshotAndTweet();
// generateTimestamps();
