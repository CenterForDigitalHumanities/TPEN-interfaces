export default function getHash(agent) {
    if (agent) {
      return agent.split("id/").pop();
    } else {
      throw new Error("No agent provided");
    }
  }
  