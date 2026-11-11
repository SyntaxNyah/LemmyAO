import { beforeEach, describe, expect, mock, test } from "bun:test";

// The transport, stubbed: only whether we joined or left matters here.
let inVoice = false;
let joins = 0;
let leaves = 0;
let capsListener: () => void = () => {};
mock.module("../voice/voice", () => ({
  isVoiceAvailable: () => true,
  isPTTOnly: () => false,
  isInVoice: () => inVoice,
  isListenOnly: () => inVoice,
  joinVoice: async () => {},
  joinVoiceListenOnly: async () => {
    joins++;
    inVoice = true;
  },
  leaveVoice: () => {
    leaves++;
    inVoice = false;
  },
  setPTT: () => {},
  onCapsChange: (fn: () => void) => {
    capsListener = fn;
    return () => {};
  },
  onSpeakingChange: () => () => {},
  getSpeakingUids: (): number[] => [],
  isLocalSpeaking: () => false,
  isLocalOpenMic: () => false,
  setLocalOpenMic: () => {},
  getLocalPlayerID: () => 1,
  getSpeakerDisplayName: () => "",
  setInputDevice: async () => {},
  getInputDeviceId: () => "",
  setOutputVolume: () => {},
  isVCMuted: () => false,
  setVCMuted: () => {},
}));

const { installVoiceUI, joinVoiceChat, leaveVoiceChat } = await import("../voice/voiceUI");
const { settings, setSetting } = await import("../core/settings");

describe("voice chat is opt-in", () => {
  beforeEach(() => {
    inVoice = false;
    joins = 0;
    leaves = 0;
  });

  test("a server offering voice doesn't join us on its own", () => {
    setSetting("voiceEnabled", false);
    installVoiceUI();
    capsListener();
    expect(joins).toBe(0);
  });

  test("joining is remembered, so the next offer joins (listening) again", async () => {
    await joinVoiceChat();
    expect(joins).toBe(1);
    expect(settings.voiceEnabled).toBe(true);
    inVoice = false;
    capsListener();
    await Promise.resolve();
    expect(joins).toBe(2);
  });

  test("leaving stays left", () => {
    inVoice = true;
    leaveVoiceChat();
    expect(leaves).toBe(1);
    expect(settings.voiceEnabled).toBe(false);
    capsListener();
    expect(joins).toBe(0);
  });
});
