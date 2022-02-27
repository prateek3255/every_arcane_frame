import ObjectsToCsv from "objects-to-csv";

const episodes = [
  {
    id: 1,
    start: 5,
    end: 2379,
    skip: [
      {
        start: 203,
        end: 270,
      },
    ],
  },
];

export interface TimestampRow {
  id: number;
  position: number;
  episode_id: number;
}

export const generateTimestamps = async () => {
  const timestamps: Array<TimestampRow> = [];
  let id = 1;
  for (const episode of episodes) {
    for (let i = episode.start; i < episode.end; i++) {
      if (episode.skip.find((skip) => skip.start <= i && skip.end >= i)) {
        continue;
      }
      timestamps.push({
        id,
        position: i,
        episode_id: episode.id,
      });
      id+=1;
    }
  }
  const csv = new ObjectsToCsv(timestamps);

  await csv.toDisk("./timestamps.csv");
};
