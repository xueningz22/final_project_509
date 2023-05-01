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
    [33.70263528325575, -118.15383911132814]
  ]
}).addTo(map);

function timeout(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

function isImageLoaded(img) {
  return new Promise((resolve, reject) => {
    if (img.complete) {
      resolve();
    }

    img.addEventListener('load', () => { resolve(); });
    img.addEventListener('error', () => { reject(); });
  });
}

let anyvalues = new Set();
map.on('mousemove', async function (e) {
  // const value = e;
  // Get the pixel value in the dataLayer at the mouse position

  // Get the coordinates of the tile that was clicked.
  // The following is adapted from https://stackoverflow.com/a/37018281/123776
  const tileSize = {x: 256, y: 256};
  const pixelPoint = map.project(e.latlng, map.getZoom()).floor();
  let coords = pixelPoint.unscaleBy(tileSize).floor();
  coords.z = Math.floor(map.getZoom());

  // Get the top-left pixel position of the tile.
  const tileTopLeftPos = dataLayer._getTilePos(coords);

  // Get the clicked pixel within the tile.
  const clickAbsolutePos = e.containerPoint;
  const clickOffsetPos = clickAbsolutePos.subtract(tileTopLeftPos);

  // Get the pixel color in the tile.
  const tileId = `${coords.x}:${coords.y}:${coords.z}`;
  dataLayer._tileCanvases = dataLayer._tileCanvases || {};
  let tileCanvasInfo = dataLayer._tileCanvases[tileId];
  if (!tileCanvasInfo) {
    tileCanvasInfo = dataLayer._tileCanvases[tileId] = {lock: true};

    if (dataLayer._tooltip) {
      dataLayer._tooltip.close();
      dataLayer._tooltip = null;
    }

    if (!dataLayer._tiles[tileId]) { return; }

    const tileImg = dataLayer._tiles[tileId].el;
    await isImageLoaded(tileImg);
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 256;
    tileCanvas.height = 256;

    const ctx = tileCanvas.getContext('2d', {willReadFrequently: true});
    ctx.drawImage(tileImg, 0, 0);

    tileCanvasInfo.canvas = tileCanvas;
    tileCanvasInfo.ctx = ctx
    dataLayer._tileCanvases[tileId] = tileCanvasInfo;

    delete tileCanvasInfo.lock;
  }
  else if (tileCanvasInfo.lock) {
    // There's already a request for this tile in progress.
    return;
  }

  const ctx = tileCanvasInfo.ctx;

  const pixel = ctx.getImageData(clickOffsetPos.x, clickOffsetPos.y, 1, 1).data;
  const color = `RGBA(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]})`;
  const lctype = lctypes[color];
  if (!anyvalues.has(color)) {
    anyvalues.add(color)
    console.log(color)
  }

  if (!dataLayer._tooltip) {
    dataLayer._tooltip = L.tooltip({
      position: 'bottom',
      noWrap: true,
      offset: L.point(0, 0),
      direction: 'top',
      permanent: false
    })
  }
  dataLayer._tooltip.close();
  if(lctype) {
    dataLayer._tooltip
        .setLatLng(e.latlng)
        .setContent(`The land cover type is ${lctype}`)
        .openOn(map);
  }


  // const pixel = dataLayer._getTilePos(e.latlng);
  // const tile = dataLayer._getTileCoords(pixel);
  // const clickOffsetPos = dataLayer._getTilePos(tile);
  // const value = dataLayer._getTileData(tile);

  // const lcTypes = {
  //   0: 'Water',
  //   1: 'Evergreen Needleleaf Forest',

  // }

  // Show a tooltip at the mouse position with the value of the pixel
  // L.tooltip({
  //   position: 'bottom',
  //   noWrap: true,
  //   offset: L.point(0, 0),
  //   direction: 'top',
  //   permanent: false
  // })

  // console.log(value);
});