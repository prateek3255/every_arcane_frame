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
  {
    id: 2,
    start: 21,
    end: 2196,
    skip: [
      {
        start: 216,
        end: 283,
      },
    ],
  },
  {
    id: 3,
    start: 40,
    end: 2379,
    skip: [
      {
        start: 117,
        end: 185,
      },
    ],
  },
  {
    id: 4,
    start: 14,
    end: 2211,
    skip: [
      {
        start: 174,
        end: 239,
      },
    ],
  },
  {
    id: 5,
    start: 14,
    end: 2209,
    skip: [
      {
        start: 306,
        end: 373,
      },
    ],
  },
  {
    id: 6,
    start: 15,
    end: 2298,
    skip: [
      {
        start: 280,
        end: 348,
      },
    ],
  },
  {
    id: 7,
    start: 17,
    end: 2176,
    skip: [
      {
        start: 159,
        end: 226,
      },
    ],
  },
  {
    id: 8,
    start: 15,
    end: 2181,
    skip: [
      {
        start: 274,
        end: 341,
      },
    ],
  },
  {
    id: 9,
    start: 19,
    end: 2226,
    skip: [
      {
        start: 147,
        end: 215,
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
