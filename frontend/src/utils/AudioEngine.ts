class AudioEngine {
  init() {
    // Disabled to remove sound
  }

  setSpeed(speed: number) {
    // Disabled to remove sound
    // (Void parameter to satisfy TS compiler)
    void speed;
  }

  toggleMute() {
    // Disabled to remove sound
    return false;
  }

  resume() {
    // Disabled to remove sound
  }
}

export const audioEngine = new AudioEngine();
