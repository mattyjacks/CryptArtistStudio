export type PetChatRole = "user" | "pet";

export interface PetChatMessage {
  role: PetChatRole;
  content: string;
  ts: number;
}

export interface PetStatsLike {
  health: number;
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
  bond: number;
  intoxication: number;
  level: number;
  xp: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function analyzeTone(text: string): { isNice: boolean; isMean: boolean; isQuestion: boolean } {
  const t = text.toLowerCase();
  const isQuestion = t.includes("?") || /\b(why|how|what|where|when|who)\b/.test(t);
  const isNice =
    /\b(thanks|thank you|love you|good|cute|sweet|sorry|please|great|awesome|nice)\b/.test(t);
  const isMean =
    /\b(stupid|hate|shut up|dumb|ugly|annoying|bad pet|idiot)\b/.test(t);
  return { isNice, isMean, isQuestion };
}

function moodFromStats(stats: PetStatsLike): "happy" | "neutral" | "grumpy" | "tired" | "dirty" | "hungry" | "tipsy" {
  if (stats.intoxication > 45) return "tipsy";
  if (stats.hunger < 25) return "hungry";
  if (stats.energy < 25) return "tired";
  if (stats.cleanliness < 25) return "dirty";
  if (stats.happiness > 70 && stats.bond > 40) return "happy";
  if (stats.happiness < 35) return "grumpy";
  return "neutral";
}

export function formatPetStateLine(stats: PetStatsLike): string {
  const mood = moodFromStats(stats);
  const tags: string[] = [];
  if (stats.hunger < 30) tags.push("hungry");
  if (stats.energy < 30) tags.push("sleepy");
  if (stats.cleanliness < 30) tags.push("dirty");
  if (stats.intoxication > 45) tags.push("tipsy");
  const tagPart = tags.length ? ` (${tags.join(", ")})` : "";
  return `Mood: ${mood}${tagPart}. Health ${Math.round(stats.health)}/100, Hunger ${Math.round(stats.hunger)}/100, Happiness ${Math.round(stats.happiness)}/100, Energy ${Math.round(stats.energy)}/100, Cleanliness ${Math.round(stats.cleanliness)}/100, Bond ${Math.round(stats.bond)}/100.`;
}

export function generateLocalPetReply(
  userText: string,
  stats: PetStatsLike
): { reply: string; nextStats: PetStatsLike } {
  const { isNice, isMean, isQuestion } = analyzeTone(userText);
  const mood = moodFromStats(stats);
  const t = userText.toLowerCase();

  let next = { ...stats };
  let bondDelta = 0;
  let happyDelta = 0;

  if (isNice) {
    bondDelta += 2;
    happyDelta += 3;
  }
  if (isMean) {
    bondDelta -= 4;
    happyDelta -= 6;
  }

  const wantsFood = /\b(food|feed|hungry|snack|treat|pizza|burger|banana|apple)\b/.test(t);
  const wantsPlay = /\b(play|game|fetch|ball|throw|quiz|memory)\b/.test(t);
  const wantsSleep = /\b(sleep|nap|tired|bed)\b/.test(t);
  const wantsBath = /\b(bath|wash|clean|dirty|soap)\b/.test(t);
  const greets = /\b(hi|hello|hey|yo|sup)\b/.test(t);
  const affection = /\b(pet|cuddle|hug|kiss)\b/.test(t);

  if (greets) {
    happyDelta += 1;
  }
  if (affection) {
    bondDelta += 1;
    happyDelta += 2;
  }

  next.bond = clamp(next.bond + bondDelta, 0, 100);
  next.happiness = clamp(next.happiness + happyDelta, 0, 100);

  const needHints: string[] = [];
  if (stats.hunger < 30) needHints.push("I could really use a snack.");
  if (stats.energy < 30) needHints.push("I’m kinda sleepy… can we nap?");
  if (stats.cleanliness < 30) needHints.push("I feel sticky. Bath time?");
  if (stats.intoxication > 45) needHints.push("I’m a little tipsy… water?");

  const personality = "Valley Net";
  const moodPhrases: Record<string, string[]> = {
    happy: ["I’m vibing!", "I feel sparkly today.", "We’re best friends."],
    neutral: ["I’m here.", "What’s up?", "Tell me things."],
    grumpy: ["Hmph.", "I’m not in the mood.", "Be nice to me."],
    tired: ["Yawn…", "I wanna curl up.", "My eyes are heavy."],
    dirty: ["Eww…", "I need a bath.", "I’m grossed out."],
    hungry: ["I’m starving.", "Food. Now.", "Do you have treats?"],
    tipsy: ["Hehe…", "The room is wiggly.", "I feel warm and silly."],
  };

  const suggest = () => {
    if (wantsFood || mood === "hungry") return "Open the Food tab and feed me something good.";
    if (wantsPlay) return "Throw the ball or start a mini-game with me.";
    if (wantsSleep || mood === "tired") return "Hit “Take Nap” so I can recharge.";
    if (wantsBath || mood === "dirty") return "Hit “Give Bath” so I can feel clean again.";
    return pick([
      "Pet me in the room (click me).",
      "Throw the ball so I can chase it.",
      "Ask me anything—keep it short and fun.",
    ]);
  };

  let reply: string;

  if (isMean) {
    reply = pick([
      "That hurt. Say something nicer.",
      "Nope. Try again with kindness.",
      "I’m a pet, not a punching bag.",
    ]);
  } else if (wantsFood) {
    reply = pick([
      "Yes please. I want something yummy.",
      "Treat time? Treat time.",
      "Feed me and I’ll purr.",
    ]);
  } else if (wantsPlay) {
    reply = pick([
      "Ball! Ball! Ball!",
      "Let’s play. I’m fast.",
      "Pick a mini-game and I’ll cheer you on.",
    ]);
  } else if (wantsSleep) {
    reply = pick([
      "Nap with me. Just a tiny one.",
      "I’ll be cuter after sleep.",
      "Ok… tuck me in.",
    ]);
  } else if (wantsBath) {
    reply = pick([
      "Bath time… I’ll forgive you if the water is warm.",
      "I’m gonna be so clean.",
      "Scrub scrub. Then cuddles.",
    ]);
  } else if (greets) {
    reply = pick([
      `Hi! It’s ${personality}.`,
      "Hey hey. I noticed you.",
      "Hello. Do we have snacks?",
    ]);
  } else if (isQuestion) {
    reply = pick([
      "I don’t know… but I know what I want.",
      "That’s a big question. Can we play first?",
      "Maybe. If you pet me I’ll think harder.",
    ]);
  } else {
    reply = pick(moodPhrases[mood]) + " " + pick([
      "Talk to me.",
      "Tell me a secret.",
      "Make it dramatic.",
      "Be gentle.",
    ]);
  }

  if (needHints.length && Math.random() < 0.7) {
    reply += " " + pick(needHints);
  }

  if (Math.random() < 0.85) {
    reply += " " + suggest();
  }

  return { reply, nextStats: next };
}

