import { loadMangaSource } from "./core/source-manager";
import { blurImage } from "./image-tools";
import "./style/style.css";
import { initAppTheme } from "./style/theme";

import placeholderCover from "/placeholder.jpg?url";

import kaliScanUrl from "/sources/manga/kaliscan.js?url";

initAppTheme();

const source = await loadMangaSource(kaliScanUrl);

const resultElement = document.getElementById("results") as HTMLDivElement;

resultElement.innerHTML += /*html*/ `
  <div class="sourceInfo">
    <img class="sourceIcon" src="${source.icon}">
    <span class="sourceName">${source.name}</span>
  </div>
  <div class="resultSource"></div>
`;

const resultSourceElement = resultElement.getElementsByClassName("resultSource")[0] as HTMLDivElement

source.search("Jinx", 1, undefined, "all").then((entries) => {
  entries.forEach((entry) => {
    const cover = entry.cover || placeholderCover;

    // 1. Crea l'elemento e imposta SUBITO il placeholder come --bg-url iniziale
    const entryDiv = document.createElement("div");
    entryDiv.className = "mangaResultEntry";
    entryDiv.innerHTML += /*html*/ `
      <img class="cover" src="${cover}" style="--bg-url: url('${placeholderCover}')">
      <div class="info">
        <span class="title">${entry.title}</span>
      </div>
    `;

    // 2. Aggiungi subito la card al DOM
    resultSourceElement.appendChild(entryDiv);

    // 3. Elabora l'immagine e aggiorna la variabile CSS appena pronta
    blurImage(cover).then((bg) => {
      const imgElement = entryDiv.querySelector(".cover") as HTMLElement;
      imgElement?.style.setProperty("--bg-url", `url('${bg}')`);
    });
  });
});