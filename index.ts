import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import dotenv from "dotenv";
import imagemin from "imagemin";
import imageminPngquant from "imagemin-pngquant";
import { TwitterClient } from "twitter-api-client";
import { createClient } from "@supabase/supabase-js";
// import { generateTimestamps } from "./generateTimestamps";

dotenv.config();

const twitterClient = new TwitterClient({
  apiKey: process.env.TWITTER_API_KEY ?? "",
  apiSecret: process.env.TWITTER_API_SECRET ?? "",
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
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
  console.log(`Random timestamp row title ${data.episodes.title} - ${data.position}`);
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
  const screenshotBase64 = fs.readFileSync("./screenshot.png", {
    encoding: "base64",
  });
  const data = await twitterClient.media.mediaUpload({
    media_data: screenshotBase64,
    media_category: "tweet_image",
  });
  const tweetData = await twitterClient.tweets.statusesUpdate({
    status: "",
    media_ids: data.media_id_string,
  });
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
  await twitterClient.tweets.statusesUpdate({
    status: `@arcane_frames ${reply}`,
    in_reply_to_status_id: tweetId,
  });
  console.log(`Replied to tweet - ${reply}`);
};

const screenshotAndTweet = async () => {
  try {
    const data = await fetchRandomRow();
    await takeScreenshotAndSaveImage(data.position, data.episodes.link);
    await compressImage();
    // const tweetData = await tweetImage();
    // await removeRowFromDatabase(data.id);
    // await replyToTweet({
    //   tweetId: tweetData.id_str,
    //   episodeTitle: data.episodes.title,
    //   position: data.position,
    // });
  } catch (error) {
    console.log(error);
    throw error;
  }
};

screenshotAndTweet();
// generateTimestamps();
