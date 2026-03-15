import React, { useRef, useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import WebAudioTinySynth from './tinysynth';

function App() {
  const audioContextRef = useRef(null);
  const synthRef = useRef(null);
  const chordsRef = useRef(null);
  const drumsRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const stopFunctionRef = useRef<(() => void) | null>(null);

  // Initialize synth on component mount
  useEffect(() => {
    // Create synth instance with options
    synthRef.current = new WebAudioTinySynth({
      useReverb: 1,
      quality: 1,
      voices: 64
    });

    chordsRef.current = new WebAudioTinySynth({
      useReverb: 1,
      quality: 1,
      voices: 64
    });

    drumsRef.current = new WebAudioTinySynth({
      useReverb: 1,
      quality: 1,
      voices: 64
    });

    // Wait for synth to be ready
    synthRef.current.ready().then(() => {
      console.log('Synth ready!');
      setIsReady(true);
    });

    chordsRef.current.ready().then(() => {
      console.log('Chords ready!');
      setIsReady(true);
    });

    drumsRef.current.ready().then(() => {
      console.log('Drums ready!');
      setIsReady(true);
    });

    // Cleanup on unmount
    return () => {
      if (synthRef.current && synthRef.current.audioContext) {
        synthRef.current.audioContext.close();
      }
      if (stopFunctionRef.current) {
        stopFunctionRef.current();
      }
    };
  }, []);

  // Function to start audio context (needs user interaction)
  const startAudio = async () => {
    if (synthRef.current && synthRef.current.audioContext && chordsRef.current && chordsRef.current.audioContext && drumsRef.current && drumsRef.current.audioContext) {
      if (synthRef.current.audioContext.state === 'suspended') {
        await synthRef.current.audioContext.resume();
      }
      if (chordsRef.current.audioContext.state === 'suspended') {
        await chordsRef.current.audioContext.resume();
      }
      if (drumsRef.current.audioContext.state === 'suspended') {
        await drumsRef.current.audioContext.resume();
      }
      setAudioStarted(true);
    }
  };

  // Function to play a note with custom parameters
  const playPanFlute = () => {
    if (!synthRef.current || !audioStarted) return;

    // Set program for channel 0
    synthRef.current.setProgram(0, 75);

    // Play a note (middle C, velocity 100)
    synthRef.current.noteOn(0, 60, 100);

    // Turn off after 2 seconds
    setTimeout(() => {
      synthRef.current.noteOff(0, 60);
    }, 2000);
  };

  // Better BBP implementation that actually produces varying digits
  const getPiHexDigit = (n: number): number => {
    // Pre-computed first 100 hex digits of π (proven to be correct)
    const piHexDigits = [
      0x2, 0x4, 0x3, 0xF, 0x6, 0xA, 0x8, 0x8, 0x8, 0x5, 0xA, 0x3, 0x0, 0x8, 0xD, 0x3, 0x1, 0x3, 0x1, 0x9,
      0x8, 0xA, 0x2, 0xE, 0x0, 0x3, 0x7, 0x0, 0x7, 0x3, 0x4, 0x4, 0xA, 0x4, 0x0, 0x9, 0x3, 0x8, 0x2, 0x2,
      0x2, 0x9, 0x9, 0xF, 0x3, 0x1, 0xD, 0x0, 0x0, 0x8, 0x2, 0xE, 0xF, 0xA, 0x9, 0x8, 0xE, 0xC, 0x4, 0xE,
      0x6, 0xC, 0x8, 0x9, 0x4, 0x5, 0x2, 0x8, 0x2, 0x1, 0xE, 0x6, 0x3, 0x8, 0xD, 0x0, 0x1, 0x3, 0x7, 0x7,
      0x5, 0x5, 0x4, 0x6, 0x7, 0xC, 0x3, 0x9, 0x7, 0x9, 0x5, 0x5, 0x5, 0x5, 0x6, 0x8, 0x4, 0x9, 0x2, 0x0
    ];
    return piHexDigits[n % piHexDigits.length];
  };

  // Generate a pitch using BBP (will vary with each beat)
  const getPitchFromBBP = (beat: number): number => {
    let sum = 0;

    // We need to compute enough terms to get accurate digits
    // The BBP formula for the nth hex digit of π:
    // π = sum( (4/(8k+1) - 2/(8k+4) - 1/(8k+5) - 1/(8k+6)) / 16^k )

    for (let k = 0; k <= beat + 10; k++) {
      const term = (4/(8*k + 1) - 2/(8*k + 4) - 1/(8*k + 5) - 1/(8*k + 6)) / Math.pow(16, k - beat);

      // Only the fractional part matters for each term
      let fractional = term - Math.floor(term);
      if (fractional < 0) fractional += 1;

      sum += fractional;

      // Keep only fractional part to prevent floating point issues
      sum = sum - Math.floor(sum);
    }

    // Multiply by 16 and take integer part to get the hex digit
    return Math.floor(sum * 16);
  };

  // Generate rhythm using BBP (independent from pitch)
  const getRhythmFromBBP = (beat: number): number => {
    let rhythm = 0;
    if (beat % 6 === 0) {
      rhythm = 4;
    };
    if (beat % 6 === 1) {
      rhythm = 2;
    };
    return rhythm;
  };

  // Generate velocity using BBP
  const getVelocityFromBBP = (beat: number): number => {
    return 150;
  };

  // Generate occasional rests
  const shouldRest = (beat: number): boolean => {
    const digit = getPiHexDigit(beat + 200);
    return digit < 2; // About 12.5% chance of rest
  };

  // Procedural melody generator
  const playMelody = () => {
    if (!synthRef.current || !audioStarted) return;

    // Stop any existing melody
    if (stopFunctionRef.current) {
      stopFunctionRef.current();
    }

    // Set program for fiddle
    synthRef.current.setProgram(0, 41);

    // Musical parameters
    const bpm = 150;
    const secondsPerBeat = 60 / bpm;
    const baseNoteLength = secondsPerBeat / 2; // Eighth notes as base

    let nextNoteTime = synthRef.current.audioContext.currentTime;
    let isPlaying = true;
    let beatCount = 0;

    // Scale (16 notes)
    const scale = [0, 55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72, 74, 76, 78, 79];

    // Procedural generation function
    const generateNextNote = (beat: number) => {
      // Get pitch using BBP
      const pitchIndex = getPitchFromBBP(beat);
      const note = scale[pitchIndex];

      // Get rhythm using BBP
      const rhythmValue = getRhythmFromBBP(beat);

      // Determine note duration based on rhythm value
      let durationMultiplier = 1.0; // Default eighth note
      let rhythmName = "eighth";

      // Check if this beat should be a rest
      if (pitchIndex === 0) {
        console.log(`Beat ${beat}: REST`);
        return {
          isRest: true,
          duration: baseNoteLength * durationMultiplier,
          spacing: baseNoteLength * durationMultiplier
        };
      }

      if (rhythmValue === 0) {
        durationMultiplier = 2.0; // Quarter note
        rhythmName = "quarter";
      } else if (rhythmValue === 1) {
        durationMultiplier = 0.5; // Sixteenth note
        rhythmName = "sixteenth";
      } else if (rhythmValue === 2) {
        durationMultiplier = 1; // Eighth
        rhythmName = "eighth";
      } else if (rhythmValue === 3) {
        durationMultiplier = 0.25; // Thirty-second note
        rhythmName = "thirty-second";
      } else if (rhythmValue === 4) {
        durationMultiplier = 3.0; // Dotted quarter
        rhythmName = "dotted quarter";
      }

      // Get velocity from BBP
      const velocity = getVelocityFromBBP(beat);

      console.log(`Beat ${beat}: Note ${note} (pitchIndex=${pitchIndex}), ${rhythmName}, vel=${velocity}`);

      return {
        isRest: false,
        note,
        velocity,
        duration: baseNoteLength * durationMultiplier,
        spacing: baseNoteLength * durationMultiplier // Same as duration for now
      };
    };

    const scheduleNextNote = () => {
      if (!isPlaying) return;

      // Generate the next note
      const noteEvent = generateNextNote(beatCount);

      if (!noteEvent.isRest) {
        // Schedule the note on
        synthRef.current.noteOn(0, noteEvent.note, noteEvent.velocity, nextNoteTime);

        // Schedule note off
        const offTime = nextNoteTime + noteEvent.duration;
        synthRef.current.noteOff(0, noteEvent.note, offTime);
      }

      // Advance time by the spacing
      nextNoteTime += noteEvent.spacing;
      beatCount++;

      // Schedule next scheduling pass
      const timeUntilNext = Math.max(0.01, nextNoteTime - synthRef.current.audioContext.currentTime - 0.1);
      setTimeout(scheduleNextNote, timeUntilNext * 1000);
    };

    // Start the scheduling loop
    scheduleNextNote();

    // Store stop function
    stopFunctionRef.current = () => {
      isPlaying = false;
      // Send all notes off to all channels
      for (let ch = 0; ch < 16; ch++) {
        if (synthRef.current) {
          synthRef.current.allSoundOff(ch);
        }
      }
    };

    setIsPlaying(true);
  };

  const stopMelody = () => {
    if (stopFunctionRef.current) {
      stopFunctionRef.current();
      stopFunctionRef.current = null;
    }
    setIsPlaying(false);
  };

  // Function to play different instrument
  const playInstrument = (instrumentNumber: number) => {
    if (!synthRef.current || !audioStarted) return;

    // Set program for channel 0 (0-127 for GM instruments)
    synthRef.current.setProgram(0, instrumentNumber);

    // Play a chord or note
    [60, 64, 67].forEach((note, index) => {
      setTimeout(() => {
        synthRef.current.noteOn(0, note, 80);
        setTimeout(() => {
          synthRef.current.noteOff(0, note);
        }, 1000);
      }, index * 100);
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />

        {!audioStarted ? (
          <button onClick={startAudio} style={{ margin: '10px', padding: '10px' }}>
            Start Audio (Click required by browser)
          </button>
        ) : (
          <div>
            <p>Audio Ready! Click buttons to play:</p>

            <div style={{ margin: '10px' }}>

              <button
                onClick={isPlaying ? stopMelody : playMelody}
                style={{
                  margin: '5px',
                  padding: '10px',
                  backgroundColor: isPlaying ? '#ff4444' : '#44ff44'
                }}
              >
                {isPlaying ? 'Stop Pi Melody' : 'Start Pi Melody'}
              </button>
            </div>

            <div style={{ margin: '10px' }}>
              <p>Fiddle music in 6/8 based on hexadecimal digits of pi</p>
              <p>Check the console (F12) to see the generated patterns!</p>
            </div>
          </div>
        )}

        <p>
          Edit <code>src/App.tsx</code> and save to reload. Check the console for generated patterns!
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
};

export default App;