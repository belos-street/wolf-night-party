import { lobbyPages } from "./lobby.js";
import { nightPages } from "./night.js";
import { dayPages } from "./day.js";
import { systemPages } from "./system.js";
import { hostPages } from "./host.js";

const pages = {
  ...lobbyPages,
  ...nightPages,
  ...dayPages,
  ...systemPages,
  ...hostPages,
};

export default pages;
