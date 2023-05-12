/* global lctypes Promise */

const map = L.map('map').setView([34.05, -118.2], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const tileURL = 'https://corsproxy.io/?' + encodeURIComponent('https://storage.googleapis.com/landcover_prediction/new_tiles/') + '{z}' + encodeURIComponent('/') + '{x}' + encodeURIComponent('/') + '{y}' + encodeURIComponent('.png');
const dataLayer = L.tileLayer(tileURL, {
  tms: 1,
  crossOrigin: true,
  opacity: 0.7,
  attribution: "",
  minZoom: 10,
  maxZoom: 12,
  interactive: true,
  bounds: [
    [34.34230217446123, -118.67156982421876],
    [33.70263528325575, -118.15383911132814],
  ],
}).addTo(map);

function isImageLoaded(img) {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      resolve();
    }

    img.addEventListener('load', () => { resolve() });
    img.addEventListener('error', () => { reject() });
  });
}

async function getTileCanvas(dataLayer, tileId) {
  dataLayer._tileCanvases = dataLayer._tileCanvases || {};
  let tileCanvasInfo = dataLayer._tileCanvases[tileId];
  if (!tileCanvasInfo) {
    console.log(`No tile canvas info found for ${tileId}.`);
    tileCanvasInfo = dataLayer._tileCanvases[tileId] = { lock: true };

    if (dataLayer._tooltip) {
      dataLayer._tooltip.close();
      dataLayer._tooltip = null;
    }

    if (!dataLayer._tiles[tileId]) { return }

    const tileImg = dataLayer._tiles[tileId].el;
    console.log(`Creating tile canvas for ${tileId}.`, tileImg);
    await isImageLoaded(tileImg);
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 256;
    tileCanvas.height = 256;

    const ctx = tileCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(tileImg, 0, 0);

    tileCanvasInfo.canvas = tileCanvas;
    tileCanvasInfo.ctx = ctx;
    dataLayer._tileCanvases[tileId] = tileCanvasInfo;

    delete tileCanvasInfo.lock;
  }
  else if (tileCanvasInfo.lock) {
    // There's already a request for this tile in progress.
    throw 'Tile has already been requested, but is not yet ready.';
  }
  return tileCanvasInfo;
}

let anyvalues = new Set();

map.on('mousemove', async function (e) {
  // There are a few different types of positions that we might want to get:
  // * The position of a point relative to the top-left corner of the map view (i.e., the "container point").
  // * The position of a point relative to the top-left corner of the tile that was clicked. (i.e., the "tile point")
  // * The position of a point relative to the top-left corner of the entire map (i.e., the "map point")

  // Get the map point of the mouse cursor.
  const mouseLatLng = e.latlng;
  const mouseMapPoint = map.project(mouseLatLng);

  // Get the x, y, and z coordinates of the tile that was clicked.
  const tileSize = { x: 256, y: 256 };
  const tileIdValues = mouseMapPoint.unscaleBy(tileSize).floor();
  tileIdValues.z = Math.floor(map.getZoom());

  // Get the map point of the top-left corner of the tile.
  const tileMapPoint = tileIdValues.scaleBy(tileSize);

  // Get the tile point of the mouse cursor (i.e., the pixel position relative
  // to the top-left corner of the tile).
  const mouseTilePoint = mouseMapPoint.subtract(tileMapPoint);

  // Get the pixel color in the tile.
  const tileId = `${tileIdValues.x}:${tileIdValues.y}:${tileIdValues.z}`;
  let tileCanvasInfo = null;
  try {
    tileCanvasInfo = await getTileCanvas(dataLayer, tileId);
  } catch (e) {
    // The tile has already been requested, but is not yet ready.
    return;
  }
  if (!tileCanvasInfo) {
    // The tile is not present in the dataLayer.
    return;
  }
  const ctx = tileCanvasInfo.ctx;

  const pixel = ctx.getImageData(mouseTilePoint.x, mouseTilePoint.y, 1, 1).data;
  const color = `RGBA(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`;
  const lctype = lctypes[color];
  if (!anyvalues.has(color)) {
    anyvalues.add(color);
  }

  if (!dataLayer._tooltip) {
    dataLayer._tooltip = L.tooltip({
      position: 'bottom',
      noWrap: true,
      offset: L.point(0, 0),
      direction: 'top',
      permanent: false,
    });
  }
  dataLayer._tooltip.close();
  if(lctype) {
    dataLayer._tooltip
      .setLatLng(e.latlng)
      .setContent(`The land cover type is ${lctype}`)
      .openOn(map);
  }
});