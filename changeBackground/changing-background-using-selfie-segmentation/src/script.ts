// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* The segmentation effect separates the foreground and background of the user in real-time.
This code initialises a camera feed and applies a selfie segmentation effect to the video feed.
*/
import DeviceDetector from "https://cdn.skypack.dev/device-detector-js@2.2.10"

const videoElement = document.getElementsByClassName('input_video')[0]
const canvasElement = document.getElementsByClassName('output_canvas')[0]
const canvasCtx = canvasElement.getContext('2d')

const blurRadius = 8

// Usage: testSupport({client?: string, os?: string}[])
// Client and os are regular expressions.
// See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
// legal values for client and os
testSupport([{ client: 'Chrome' }])

function testSupport(supportedDevices) {
  const deviceDetector = new DeviceDetector()
  const detectedDevice = deviceDetector.parse(navigator.userAgent)

  let isSupported = false
 
  for (const device of supportedDevices) {
    if (device.client !== undefined) {
      const re = new RegExp(`^${device.client}$`)
  
      if (!re.test(detectedDevice.client.name)) continue
    }

    if (device.os !== undefined) {
      const re = new RegExp(`^${device.os}$`)
  
      if (!re.test(detectedDevice.os.name)) continue
    }
 
    isSupported = true
 
    break
  }

  if (!isSupported) {
    alert(`This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
          `is not well supported at this time, continue at your own risk.`)
  }
}

function onResults(results) {
  canvasCtx.save()
  
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height)
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height)

  canvasCtx.globalCompositeOperation = 'destination-atop'
  canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height)

  canvasCtx.globalCompositeOperation = 'destination-over'
  // canvasCtx.filter = `blur(${blurRadius}px)`
  // canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)
  canvasCtx.drawImage(bgImage, 0, 0, canvasElement.width, canvasElement.height)
  canvasCtx.fillStyle = '#E7D9FF';
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  
  canvasCtx.restore()
}

const selfieSegmentation = new SelfieSegmentation({locateFile: (file) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
})

selfieSegmentation.setOptions({
  selfieMode: true,
  modelSelection: 0,
  effect: 'mask'
})

selfieSegmentation.onResults(onResults)

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await selfieSegmentation.send({image: videoElement})
    predictWebcam()
  },
  width: 640,
  height: 360
})

camera.start()




import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";
const { ImageSegmenter, SegmentationMask, FilesetResolver } = vision;

const MDCSlider = mdc.slider.MDCSlider;

// Get DOM elements
const outputCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
const outputCanvasCtx = outputCanvasElement.getContext("2d");
const bgImgCanvasElement = document.createElement("canvas");
const bgImgCanvasCtx = bgImgCanvasElement.getContext("2d");
let bgImageData = null;

const demosSection: HTMLElement = document.getElementById("demos");
let runningMode: "IMAGE" | "VIDEO" = "VIDEO";

let imageSegmenter: ImageSegmenter;

// Define the range of confidence score for object edge blending effect.
let minConfidence = 0.4,
  maxConfidence = 0.7;

// Configure value change listener for confidence score sliders
const sliderMinGbConf = new MDCSlider(document.querySelector(".slider-min-cf"));
const txtMinGbConf = document.getElementsByClassName(
  "slider-min-cf-value"
)[0] as HTMLElement;
sliderMinGbConf.listen("MDCSlider:change", () => {
  txtMinGbConf.innerHTML = `${sliderMinGbConf.getValue()}`;
  minConfidence = sliderMinGbConf.getValue();
});

const sliderMaxGbConf = new MDCSlider(document.querySelector(".slider-max-cf"));
const txtMaxGbConf = document.getElementsByClassName(
  "slider-max-cf-value"
)[0] as HTMLElement;
sliderMaxGbConf.listen("MDCSlider:change", () => {
  txtMaxGbConf.innerHTML = `${sliderMaxGbConf.getValue()}`;
  maxConfidence = sliderMaxGbConf.getValue();
});

// Set default values for confidence scores
sliderMinGbConf.setValue(minConfidence);
sliderMaxGbConf.setValue(maxConfidence);

async function createImageSegmenter() {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  imageSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
      delegate: "GPU"
    },
    runningMode: runningMode,
    outputCategoryMask: true,
    outputConfidenceMasks: true
  });
  demosSection.classList.remove("invisible");
  if (hasGetUserMedia()) {
    enableCamera();
  } else {
    alert("getUserMedia() is not supported by your browser");
  }
}
createImageSegmenter();

// Callback get executed for every
function drawSegmentationResult(result: ImageSegmenterResult) {
  const confidenceMasks = result.confidenceMasks[0].getAsFloat32Array();

  // Load the foreground image from the webcam.
  const width = outputCanvasElement.width,
    height = outputCanvasElement.height;
  let fgImgData = outputCanvasCtx.getImageData(0, 0, width, height).data;

  // Copy the background image to the result array.
  let resultImgData = bgImageData.slice(0);

  // Loop through the confidence mask to find the foreground pixels.
  for (let i = 0; i < confidenceMasks.length; i++) {
    if (confidenceMasks[i] > minConfidence) {
      const redIdx = i * 4,
        greenIdx = redIdx + 1,
        blueIdx = redIdx + 2;
      if (confidenceMasks[i] < maxConfidence) {
        // Pixel in the "edge" area, so blending background and foreground.
        const bgAlpha = confidenceMasks[i];
        const fgAlpha = 1 - confidenceMasks[i];
        resultImgData[redIdx] =
          resultImgData[redIdx] * bgAlpha + fgImgData[redIdx] * fgAlpha;
        resultImgData[greenIdx] =
          resultImgData[greenIdx] * bgAlpha + fgImgData[greenIdx] * fgAlpha;
        resultImgData[blueIdx] =
          resultImgData[blueIdx] * bgAlpha + fgImgData[blueIdx] * fgAlpha;
      } else {
        // Foreground pixel.
        resultImgData[redIdx] = fgImgData[redIdx];
        resultImgData[greenIdx] = fgImgData[greenIdx];
        resultImgData[blueIdx] = fgImgData[blueIdx];
      }
    }
    // Do nothing for background pixels as they're already copied to the result array.
  }

  // Draw the result image.
  const uint8Array = new Uint8ClampedArray(resultImgData.buffer);
  const cameraImageData = new ImageData(uint8Array, width, height);
  outputCanvasCtx.putImageData(cameraImageData, 0, 0);
}

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Get segmentation from the webcam
let isFirstFrame = true;
async function predictWebcam() {
  if (isFirstFrame) {
    bgImageDivElements.style.display = "block";
    isFirstFrame = false;
    outputCanvasElement.width = videoElement.videoWidth;
    outputCanvasElement.height = videoElement.videoHeight;

    bgImageData = calculateBackgroundImageData(
      bgImage,
      outputCanvasElement.width,
      outputCanvasElement.height
    );
  }

  outputCanvasCtx.save();
  outputCanvasCtx.clearRect(0, 0, videoElement.videoWidth, videoElement.videoHeight);
  outputCanvasCtx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

  // Do not run ML model if imageSegmenter hasn't loaded.
  if (imageSegmenter === undefined) {
    return;
  }

  let nowInMs: number = Date.now();

  // Start segmenting the stream.
  imageSegmenter.segmentForVideo(
    outputCanvasElement,
    nowInMs,
    drawSegmentationResult
  );
}

// Enable the live webcam view and start imageSegmentation.
async function enableCamera() {
  if (imageSegmenter === undefined) {
    return;
  }

}

// Set up the UI for selection of background image
const bgImageDivElements = document.getElementById("background");
const imageElements = bgImageDivElements.getElementsByTagName("img");
let bgImage = imageElements[0];
for (let i = 0; i < imageElements.length; i++) {
  const image = imageElements[i];
  image.addEventListener("click", didChangeBackgroundImage);
}

function didChangeBackgroundImage(event) {
  bgImage = event.target;
  bgImageData = calculateBackgroundImageData(
    bgImage,
    outputCanvasElement.width,
    outputCanvasElement.height
  );
}

// Render the background image to a canvas and extract pixel data.
function calculateBackgroundImageData(
  imgElement: HTMLElement,
  videoWidth: int,
  videoHeight: int
): int[] {
  // Scale the background image to fit the video frame and be at the center.
  let newWidth = videoWidth,
    newHeight = videoHeight;
  let startX = 0,
    startY = 0;
  if (videoWidth / videoHeight < imgElement.width / imgElement.height) {
    newWidth = videoHeight * (imgElement.width / imgElement.height);
    startX = (newWidth - videoWidth) / 2;
  } else {
    newHeight = (videoWidth * imgElement.height) / imgElement.width;
    startY = (newHeight - videoHeight) / 2;
  }

  
  bgImgCanvasElement.width = newWidth;
  bgImgCanvasElement.height = newHeight;
  
  canvasElement.width = newWidth;
  canvasElement.height = newHeight;
  
  bgImgCanvasCtx.drawImage(imgElement, 0, 0, newWidth, newHeight);

  // Return the background image data.
  return bgImgCanvasCtx.getImageData(startX, startY, videoWidth, videoHeight)
    .data;
}
