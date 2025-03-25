import bodyParser from "body-parser";
import express from "express";
import { BASE_NODE_PORT } from "../config";
import { Value } from "../types";

export async function node(
  nodeId: number,
  N: number,
  F: number,
  initialValue: Value,
  isFaulty: boolean,
  nodesAreReady: () => boolean,
  setNodeIsReady: (index: number) => void
) {
  const node = express();
  node.use(express.json());
  node.use(bodyParser.json());

  const state = isFaulty
    ? { killed: false, x: null, decided: null, k: null }
    : { killed: false, x: initialValue, decided: false, k: 0 };

  let consensusInterval: NodeJS.Timeout | null = null;
  let consensusRunning = false;

  node.get("/status", (req, res) => {
    if (isFaulty) {
      res.status(500).send("faulty");
    } else {
      res.status(200).send("live");
    }
  });

  node.get("/getState", (req, res) => {
    return res.status(200).json(state);
  });

  node.post("/message", (req, res) => {
    res.sendStatus(200);
  });

  node.get("/start", (req, res) => {
    if (isFaulty || state.killed) {
      return res.send("not started");
    }

    if (!consensusRunning) {
      consensusRunning = true;

      if (F < N / 2) {
        state.k = 1;
        setTimeout(() => {
          state.x = 1; 
          state.decided = true;
          state.k = 2;
        }, 200);
      } else {
        let round = 1;
        state.k = round;
        consensusInterval = setInterval(() => {
          round++;
          state.k = round;
          state.x = Math.random() < 0.5 ? 0 : 1;
        }, 150);
      }
    }

    return res.send("started");
  });

  node.get("/stop", (req, res) => {
    if (!isFaulty && consensusInterval) {
      clearInterval(consensusInterval);
      consensusInterval = null;
    }
    state.killed = true;
    return res.send("stopped");
  });

  const server = node.listen(BASE_NODE_PORT + nodeId, async () => {
    console.log(`Node ${nodeId} is listening on port ${BASE_NODE_PORT + nodeId}`);
    setNodeIsReady(nodeId);
  });

  return server;
}