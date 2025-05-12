class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 2732; // Match the expected buffer size
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input.length > 0) {
      // Accumulate audio data
      this._buffer = this._buffer.concat(Array.from(input[0]));
      
      // When we have enough data, send it
      if (this._buffer.length >= this._bufferSize) {
        const audioData = this._buffer.slice(0, this._bufferSize);
        this._buffer = this._buffer.slice(this._bufferSize);
        
        this.port.postMessage({
          audioData: new Float32Array(audioData)
        });
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);