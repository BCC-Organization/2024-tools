// 录制音频流并输出为 16KHZ PCM数据

let stream: MediaStream = new MediaStream()

const audioContext = new AudioContext({
    sampleRate: 16000 // 设置采样率为 16kHz
});
const mediaStreamSource = audioContext.createMediaStreamSource(stream);
const scriptNode = audioContext.createScriptProcessor(4096, 1, 1); // 创建 ScriptProcessorNode
console.log('开始连接');

mediaStreamSource.connect(scriptNode);
scriptNode.connect(audioContext.destination); // 连接到目的地
scriptNode.onaudioprocess = (audioProcessingEvent) => {
    const inputBuffer = audioProcessingEvent.inputBuffer.getChannelData(0);
    const outputBuffer = new Float32Array(inputBuffer.length); // 创建输出缓冲区
    // 将输入数据复制到输出缓冲区
    outputBuffer.set(inputBuffer);
    // 转换 Float32Array 为 Int16Array
    const pcmData = new Int16Array(outputBuffer.length);
    for (let i = 0; i < outputBuffer.length; i++) {
        pcmData[i] = outputBuffer[i] < 0 ? outputBuffer[i] * 0x8000 : outputBuffer[i] * 0x7FFF;
    }
    // 将PCM数据进行操作
    pcmData.buffer
}