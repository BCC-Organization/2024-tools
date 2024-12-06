import {Camera} from "@mediapipe/camera_utils"
import {SelfieSegmentation} from "@mediapipe/selfie_segmentation"
import {FilesetResolver, ImageSegmenter} from "@mediapipe/tasks-vision"

class BCC {

    public addBackground1(): MediaStream {
        let width = 640
        let fps = 30;
        let height = 360;
    
        // 动态创建 video 元素
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.width = width;
        videoElement.height = height;
    
        // 动态创建 canvas 元素和屏幕外 canvas 元素
        const outputCanvas = document.createElement('canvas');
        const canvasCtx = outputCanvas.getContext('2d')!;
        const offscreenCanvas = document.createElement('canvas');
        const offscreenCtx = offscreenCanvas.getContext('2d')!;
        
        // 设置 canvas 尺寸
        outputCanvas.width = width;
        outputCanvas.height = height;
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
    
        // 隐藏 video 和 canvas 元素
        videoElement.style.display = 'none';
        outputCanvas.style.display = 'none';
    
        const backgroundimg = new Image();
        backgroundimg.crossOrigin = "anonymous";
        backgroundimg.src = "https://img1.baidu.com/it/u=2589060270,1077055505&fm=253&fmt=auto&app=120&f=JPEG?w=640&h=360";
    
        function onResults(results: { image: CanvasImageSource; segmentationMask: CanvasImageSource }) {
            canvasCtx.save()
            
            canvasCtx.clearRect(0, 0, width, height)
            canvasCtx.drawImage(results.image, 0, 0, width, height)
          
            canvasCtx.globalCompositeOperation = 'destination-atop'
            canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height)
          
            canvasCtx.globalCompositeOperation = 'destination-over'
            // canvasCtx.filter = `blur(${blurRadius}px)`
            // canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)
            canvasCtx.drawImage(backgroundimg, 0, 0, width, height)
            canvasCtx.fillStyle = '#E7D9FF';
            canvasCtx.fillRect(0, 0, width, height);
            
            canvasCtx.restore()
        }
          
        const selfieSegmentation = new SelfieSegmentation({locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        })
        
        selfieSegmentation.setOptions({
        selfieMode: true,
        modelSelection: 0
        })
        
        selfieSegmentation.onResults(onResults)
    
        const camera = new Camera(videoElement, {
        onFrame: async () => {
            await selfieSegmentation.send({image: videoElement})
        },
        width: 640,
        height: 360
        })
        
        camera.start()
        
        return outputCanvas.captureStream(fps)
    }
    
    
    public async addBackground2(track: MediaStreamTrack): Promise<MediaStream> {
        let sourStream = new MediaStream();
        sourStream.addTrack(track);
    
        const width = 640
        const height = 360
        const frameRate = 30
        let backgroundImageUrl = "https://img1.baidu.com/it/u=2589060270,1077055505&fm=253&fmt=auto&app=120&f=JPEG?w=640&h=360"
        
        // 动态创建 video 元素
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.width = width;
        videoElement.height = height;
    
        // 动态创建 canvas 元素和屏幕外 canvas 元素
        const outputCanvas = document.createElement('canvas');
        const ctx = outputCanvas.getContext('2d', {
            willReadFrequently: true  // 告诉浏览器你将频繁读取 canvas 内容
        })!;
    
        const bgImgCanvasElement = document.createElement("canvas");
        const bgImgCanvasCtx = bgImgCanvasElement.getContext("2d", {
            willReadFrequently: true  // 告诉浏览器你将频繁读取 canvas 内容
        })!;
        let bgImageData;
    
        videoElement.width = width
        videoElement.height = height
    
        outputCanvas.width = width
        outputCanvas.height = height
        
        
        let runningMode: "IMAGE" | "VIDEO" = "VIDEO";
        let imageSegmenter;
    
        async function createImageSegmenter() {
            const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
            imageSegmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
                    delegate: "GPU"
                },
                runningMode: runningMode,
                outputCategoryMask: true,
                outputConfidenceMasks: true
            });
        }
    
        await createImageSegmenter();
    
        const backgroundimg = new Image();
        backgroundimg.crossOrigin = "anonymous";
        backgroundimg.src = backgroundImageUrl;
        backgroundimg.onload = () => {
            videoElement.srcObject = sourStream;
            videoElement.onplaying = () => {
                predictWebcam();
            }
            videoElement.play();
        }
    
        let minConfidence = 0.27, maxConfidence = 0.27;
    
        function drawSegmentationResult(result) {
            const confidenceMasks = result.confidenceMasks[0].getAsFloat32Array();
            // Load the foreground image from the webcam.
            const width = outputCanvas.width, height = outputCanvas.height;
            let fgImgData = ctx.getImageData(0, 0, width, height).data;
            // Copy the background image to the result array.
            let resultImgData = bgImageData.slice(0);
            // Loop through the confidence mask to find the foreground pixels.
            for (let i = 0; i < confidenceMasks.length; i++) {
                if (confidenceMasks[i] > minConfidence) {
                    const redIdx = i * 4, greenIdx = redIdx + 1, blueIdx = redIdx + 2;
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
                    }
                    else {
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
            ctx.putImageData(cameraImageData, 0, 0);
        }
    
    
        // Get segmentation from the webcam
        let isFirstFrame = true;
        const predictWebcam = async () => {
            if (isFirstFrame) {
                isFirstFrame = false;
                outputCanvas.width = videoElement.videoWidth;
                outputCanvas.height = videoElement.videoHeight;
                bgImageData = calculateBackgroundImageData(backgroundimg, outputCanvas.width, outputCanvas.height);
            }
            ctx.save();
            ctx.clearRect(0, 0, videoElement.videoWidth, videoElement.videoHeight);
            ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
            // Do not run ML model if imageSegmenter hasn't loaded.
            if (imageSegmenter === undefined) {
                return;
            }
            let nowInMs = Date.now();
            // Start segmenting the stream.
            imageSegmenter.segmentForVideo(outputCanvas, nowInMs, drawSegmentationResult);
            
            requestAnimationFrame(predictWebcam)
        }
    
        // Render the background image to a canvas and extract pixel data.
        function calculateBackgroundImageData(imgElement, videoWidth, videoHeight) {
            // Scale the background image to fit the video frame and be at the center.
            let newWidth = videoWidth, newHeight = videoHeight;
            let startX = 0, startY = 0;
            if (videoWidth / videoHeight < imgElement.width / imgElement.height) {
                newWidth = videoHeight * (imgElement.width / imgElement.height);
                startX = (newWidth - videoWidth) / 2;
            }
            else {
                newHeight = (videoWidth * imgElement.height) / imgElement.width;
                startY = (newHeight - videoHeight) / 2;
            }
            bgImgCanvasElement.width = newWidth;
            bgImgCanvasElement.height = newHeight;
            bgImgCanvasCtx.drawImage(imgElement, 0, 0, newWidth, newHeight);
            // Return the background image data.
            return bgImgCanvasCtx.getImageData(startX, startY, videoWidth, videoHeight)
                .data;
        }
        
        
        return outputCanvas.captureStream(frameRate)
    }

}

