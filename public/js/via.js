// Via — BeyondAi's on-site chat assistant. Runs entirely in the browser (no network calls).
// Styles live in css/via.css (the site CSP blocks injected <style> tags).
// Optional settings: set window.VIA_CONFIG = { showMood, startOpen, colorScheme, memory, memoryKey } before this script loads.
// Memory: a small conversation memory is kept in localStorage for 7 days; "Start new chat" clears it.
(() => {
  // src/text.js
  var CONTRACTIONS = [
    [/\bcan'?t\b/g, "can not"],
    [/\bcannot\b/g, "can not"],
    [/\bwon'?t\b/g, "will not"],
    [/\bshan'?t\b/g, "shall not"],
    [/\bain'?t\b/g, "is not"],
    [/\bi'?m\b/g, "i am"],
    [/\bim\b/g, "i am"],
    [/\blet's\b/g, "let us"],
    [/\b(it|that|what|there|here|who|where|how|he|she)'s\b/g, "$1 is"],
    [/n't\b/g, " not"],
    [/'re\b/g, " are"],
    [/'ve\b/g, " have"],
    [/'ll\b/g, " will"],
    [/'d\b/g, " would"],
    [/\b(dont|doesnt|didnt|isnt|arent|wasnt|werent|havent|hasnt|wouldnt|couldnt|shouldnt)\b/g, (w) => w.slice(0, -2) + " not"]
  ];
  function normalize(input) {
    let text = String(input).toLowerCase().replace(/[‘’`´]/g, "'").replace(/&/g, " and ");
    for (const [pattern, replacement] of CONTRACTIONS) {
      text = text.replace(pattern, replacement);
    }
    return text.replace(/'s\b/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  function splitSentences(paragraph) {
    // Separate independent questions even when visitors omit punctuation.
    return String(paragraph)
      .replace(/\s+(and|but|also)\s+(?=(?:i (?:want|need|think|believe|hope|prefer|remember|feel|am|have|cannot|can not|do not)|we (?:want|need|have)|my (?:name|friend|wife|husband)|can you|could you|would you)\b)/gi, "\n")
      .replace(/\b(i|we)\s+(want|need|hope|prefer)\s+([^.!?;\n]+?)\s+and\s+(?=(?:want|need|hope|prefer)\b)/gi, "$1 $2 $3\n$1 ")
      .replace(/\s+(?:and|also)\s+(?=(?:what|how|why|where|when|who|can you|do you|does it|is it)\b)/gi, "\n").replace(/([.!?;]+)(\s+|$)/g, "$1\n").replace(/(?:,\s*|\s+)(?:and also|and another thing|on top of that)\s+|,\s*(?:also|plus),?\s+/gi, "\n").replace(/(?:,\s*|,?\s+(?:and|but|so)\s+)(?=(?:honestly\s+|really\s+|now\s+)?(?:i|i'm|im|i've|we|we're|my|our)\b)/gi, "\n").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  }
  function containsPhrase(text, phrase) {
    return phrase !== "" && ` ${text} `.includes(` ${phrase} `);
  }
  function phraseIndex(text, phrase) {
    const at = ` ${text} `.indexOf(` ${phrase} `);
    return at === -1 ? -1 : at;
  }
  function replacePhrase(text, phrase, replacement) {
    if (!phrase) return text;
    return ` ${text} `.split(` ${phrase} `).join(` ${replacement} `).trim().replace(/\s+/g, " ");
  }
  function applySynonyms(text, synonyms) {
    let out = text;
    for (const { variants, canonical } of synonyms) {
      const target = normalize(canonical);
      for (const variant of variants) {
        const v = normalize(variant);
        if (v && v !== target) out = replacePhrase(out, v, target);
      }
    }
    return out;
  }
  function reflect(text, reflections) {
    const rules = reflections.flatMap(({ from, to }) => from.map((f) => ({ words: normalize(f).split(" "), to }))).filter((r) => r.words[0]).sort((a, b) => b.words.length - a.words.length);
    const words = text.split(" ").filter(Boolean);
    const out = [];
    for (let i = 0; i < words.length; ) {
      const rule = rules.find((r) => r.words.every((w, k) => words[i + k] === w));
      if (rule) {
        // "You" can be a subject or an object. A fixed "you -> me" rule
        // produced "me understand you" and "you think me care".
        let replacement = rule.to;
        if (rule.words.length === 1 && rule.words[0] === "you" && rule.to === "me") {
          const before = words[i - 1] || "";
          const after = words[i + 1] || "";
          const subjectVerb = /^(?:am|are|were|have|had|do|did|can|could|will|would|should|might|must|never|always|still|really|understand|care|listen|make|mean|know|think|feel|want|need|help|seem|look|sound|said|told|keep|believe|remember|support|ignored|understood|made|helped|hurt|hate|love)$/;
          const afterPreposition = /^(?:to|for|with|from|about|at|of|beside|behind|between|without|against|toward|towards)$/;
          replacement = !afterPreposition.test(before) && (i === 0 || subjectVerb.test(after) || /^(?:that|because|if|when|whether|while|and|but|think|thought|hope|wish|know|feel)$/.test(before)) ? "I" : "me";
        }
        out.push(replacement);
        i += rule.words.length;
      } else {
        out.push(words[i]);
        i += 1;
      }
    }
    return out.join(" ");
  }
  function fill(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      var _a;
      return key in values ? String((_a = values[key]) != null ? _a : "") : match;
    });
  }
  var QUESTION_START = /^(do|does|did|are|is|was|were|am|can|could|would|will|should|shall|have|has|what|why|how|who|whom|whose|where|when|which|may|might)\b/i;
  var QUESTION_CLAUSE = /,\s*(what|how|why|when|where|who|which|do|does|did|are|is|can|could|would|will)\b/i;
  var TRAILING_EMOJI = /((?:\s*(?:\p{Extended_Pictographic}|️|‍|[❓❔]))+)\s*$/u;
  function tidy(text) {
    let s = String(text).replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1").replace(/([,;:])(?:\s*[,;:])+/g, "$1").replace(/,\s*([.!?])/g, "$1").replace(/([.!?])\s*,/g, "$1").replace(/\b(\w+)(\s+\1\b)+/gi, "$1").replace(/(^|[\s(])i(?=[\s,.!?']|$)/g, "$1I").trim();
    const emojiMatch = s.match(TRAILING_EMOJI);
    const emoji = emojiMatch ? emojiMatch[1].trim() : "";
    let body = emojiMatch ? s.slice(0, emojiMatch.index).trim() : s;
    body = body.replace(/[,;:\s]+$/, "");
    if (body && !/[.!?…]$/.test(body)) {
      const lastSentence = body.split(/[.!?]\s+/).pop() || body;
      const asks = QUESTION_START.test(lastSentence) || QUESTION_CLAUSE.test(lastSentence);
      body += asks ? "?" : ".";
    }
    body = body.replace(/(^|[.!?]\s+)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
    return [body, emoji].filter(Boolean).join(" ");
  }
  function titleCase(name) {
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function pick(list, random = Math.random) {
    if (!list || list.length === 0) return void 0;
    return list[Math.floor(random() * list.length)];
  }

  // src/mood.js
  var MIN_SCORE = 1;
  var STRONG_SCORE = 2.5;
  var CUES = {
    angry: {
      angry: 1.5,
      mad: 1,
      furious: 2,
      livid: 2,
      enraged: 2,
      pissed: 1.5,
      "pissed off": 2,
      outraged: 2,
      annoyed: 1,
      annoying: 1,
      irritated: 1,
      irritating: 1,
      infuriating: 2,
      hate: 1.2,
      rage: 1.5,
      "fed up": 1.5,
      "sick of": 1.5,
      "had enough": 1.5,
      frustrated: 1,
      frustrating: 1,
      ridiculous: 1,
      unacceptable: 1.5,
      useless: 1,
      stupid: 1,
      idiot: 1.5,
      worst: 1,
      terrible: 0.8,
      awful: 0.8,
      scam: 1,
      damn: 1,
      wtf: 1.5,
      "shut up": 1.5,
      disgusted: 1.2
    },
    distressed: {
      stressed: 1.5,
      stress: 1,
      stressful: 1,
      anxious: 1.5,
      anxiety: 1.5,
      worried: 1,
      worry: 1,
      worrying: 1,
      nervous: 1,
      panic: 2,
      panicking: 2,
      "panic attack": 2.5,
      scared: 1.2,
      afraid: 1,
      terrified: 2,
      frightened: 1.5,
      overwhelmed: 1.5,
      "freaking out": 2,
      desperate: 1.5,
      "can not cope": 2,
      "can not handle": 1.5,
      "can not breathe": 2,
      "can not sleep": 1.2,
      "help me": 0.5,
      urgent: 1,
      emergency: 1.5,
      pressure: 0.8,
      tense: 1,
      restless: 1,
      helpless: 1.5,
      "falling apart": 2,
      "losing it": 1.5,
      "do not know what to do": 1.5,
      confused: 0.8,
      lost: 0.6,
      "can not focus": 1.2,
      "problem with my": 1,
      "problems with my": 1,
      "trouble with my": 1,
      nightmare: 1,
      "bad dream": 1,
      "bills keep coming": 1.5,
      "the bills": 0.8,
      "pile of bills": 1.2,
      "running out of money": 1.5,
      hacked: 1.2,
      "got hacked": 1.5,
      "were hacked": 1.5,
      scammed: 1.5,
      "data breach": 1.5,
      ransomware: 1.5,
      sick: 0.8,
      "is sick": 1,
      "in the hospital": 1.5,
      hospitalized: 1.5,
      injured: 1,
      "too much": 0.8,
      "do not know how": 1
    },
    depressed: {
      sad: 1.2,
      depressed: 2,
      depression: 2,
      hopeless: 2,
      worthless: 2,
      empty: 1,
      numb: 1.2,
      lonely: 1.5,
      alone: 1,
      miserable: 1.5,
      unhappy: 1.2,
      crying: 1.5,
      cry: 1,
      tears: 1,
      heartbroken: 1.5,
      grief: 1.5,
      grieving: 1.5,
      "broken heart": 1.5,
      down: 0.6,
      "feel down": 1.5,
      "feeling down": 1.5,
      gloomy: 1,
      "no point": 1.5,
      "give up": 1.5,
      "giving up": 1.5,
      "tired of everything": 2,
      "nobody cares": 1.5,
      "no one cares": 1.5,
      useless: 0.5,
      "hate myself": 2,
      exhausted: 1.2,
      "burned out": 1.5,
      "burnt out": 1.5,
      drained: 1.2,
      failure: 1,
      "what is the point": 1.5,
      "i am stupid": 2,
      "i am useless": 2,
      "i am worthless": 1,
      "i am a failure": 2,
      "i am a loser": 2,
      "i am not good enough": 2.5,
      "nothing matters": 2,
      "no hope": 2,
      hurt: 1.2,
      hurts: 1.2,
      "so hurt": 1.5,
      betrayed: 1.8,
      "lied to me": 1.5,
      abandoned: 1.8,
      rejected: 1.5,
      "who to trust": 1.5,
      "trust anyone": 1.5,
      "let down": 1.2,
      disappointed: 1,
      "miss her": 1.2,
      "miss him": 1.2,
      "lost my": 0.6,
      "passed away": 1.5,
      "does not care": 1.2,
      "do not care about me": 1.5,
      "nobody listens": 1.5,
      "no one listens": 1.5,
      "do not know anymore": 1.2,
      "left me": 1.5,
      died: 1.2,
      "broke up": 1.5,
      "dumped me": 1.5,
      "cheated on me": 2
    },
    jolly: {
      haha: 1.5,
      hahaha: 2,
      hehe: 1.5,
      lol: 1.5,
      lmao: 2,
      rofl: 2,
      xd: 1.5,
      funny: 1,
      hilarious: 1.5,
      joke: 1,
      joking: 1,
      kidding: 1,
      silly: 0.8,
      "made me laugh": 1.5,
      laughing: 1.2,
      laugh: 0.8,
      playful: 1,
      woohoo: 1.5,
      yay: 1.2,
      wheee: 1.2
    },
    happy: {
      happy: 1.5,
      glad: 1.2,
      great: 0.8,
      good: 0.5,
      wonderful: 1.2,
      awesome: 1,
      amazing: 1,
      excellent: 1,
      fantastic: 1.2,
      excited: 1.5,
      thrilled: 1.5,
      delighted: 1.5,
      joyful: 1.5,
      grateful: 1.2,
      thankful: 1.2,
      blessed: 1.2,
      pleased: 1,
      "love it": 1.5,
      "love this": 1.5,
      perfect: 0.8,
      nice: 0.5,
      relieved: 1,
      proud: 1,
      cheerful: 1.5,
      content: 0.8,
      "feel good": 1.5,
      "feeling good": 1.5,
      "feel great": 1.5,
      "best day": 2,
      "feel better": 1.2,
      "feeling better": 1.2,
      "better now": 1,
      "okay now": 0.8,
      "much better": 1.5,
      "medyo okay na": 1,
      "okay na ako": 1,
      "gumaan": 1.2,
      "gumaan ang loob": 1.5
    }
  };
  var EMOJI_CUES = (
    /** @type {[RegExp, Exclude<Mood, "neutral">, number][]} */
    [
      [/[😡🤬😠👿💢]/gu, "angry", 1.5],
      [/[😰😨😱😟😥😬🥺]/gu, "distressed", 1.2],
      [/[😢😭😞😔😿💔🥀]/gu, "depressed", 1.5],
      [/[😂🤣😆😜😝🤪😹]/gu, "jolly", 1.5],
      [/[😊😁😀😃😄🙂🥰😍❤🎉🥳✨👍]/gu, "happy", 1]
    ]
  );
  var INTENSIFIERS = /* @__PURE__ */ new Set(["very", "so", "really", "extremely", "super", "too", "totally", "incredibly", "deeply", "absolutely", "completely", "fucking", "freaking", "sobrang", "sobra", "grabe", "talaga", "ang", "napaka"]);
  var NEGATIONS = /* @__PURE__ */ new Set(["not", "never", "no", "hardly", "barely", "without", "hindi", "di"]);
  var NEGATION_WINDOW = 3;
  var KEEP_GOING = /* @__PURE__ */ new Set(["stop", "help", "quit", "stopping"]);
  var NEGATED_BECOMES = { happy: "depressed", jolly: null, angry: null, distressed: null, depressed: null };
  var NEGATED_WEIGHT = 0.8;
  var NEGATED_POSITIVE = /* @__PURE__ */ new Set(["okay", "ok", "fine", "alright", "well"]);
  var CRISIS = [
    /\bsuicid/,
    /\bkill (myself|me)\b/,
    /\b(end|take) (my|my own) life\b/,
    /\bend it all\b/,
    /\bwant to die\b/,
    /\bwanna die\b/,
    /\bbetter off dead\b/,
    /\bdo not want to (live|be alive|be here|exist)\b/,
    /\bno reason to (live|go on)\b/,
    /\bself ?harm/,
    /\b(hurt|cut|harm) myself\b/,
    /\bnot worth living\b/,
    // Tagalog / Taglish
    /\bmagpakamatay\b/,
    /\bmagpapakamatay\b/,
    /\b(gusto|gustong|gusto ko) (ko )?(na|nang) (mamatay|mawala)\b/,
    /\bayoko (na|nang) mabuhay\b/,
    /\bayaw ko (na|nang) mabuhay\b/,
    /\btapusin (ko )?(na )?(ang )?buhay ko\b/,
    /\bsaktan (ang )?sarili ko\b/,
    /\bwala (na )?(akong )?(dahilan|kwenta) (para )?mabuhay\b/
  ];
  var TAGALOG_CUES = {
    angry: {
      galit: 1.5,
      "galit na galit": 2.5,
      naiinis: 1.2,
      inis: 1,
      nakakainis: 1.2,
      badtrip: 1.5,
      "bad trip": 1.5,
      nakakabwisit: 1.5,
      bwisit: 1.5,
      asar: 1,
      naaasar: 1.2,
      "nakakagalit": 1.5,
      "sawang sawa": 1.5,
      "suko na ako sa": 1
    },
    distressed: {
      kinakabahan: 1.5,
      kabado: 1.2,
      takot: 1.2,
      natatakot: 1.5,
      "nag aalala": 1.5,
      nagaalala: 1.5,
      "hindi mapakali": 1.5,
      "di mapakali": 1.5,
      "hindi ko alam ang gagawin": 2,
      "di ko alam gagawin": 2,
      "hindi ko na kaya": 2,
      "di ko na kaya": 2,
      "ang daming problema": 1.5,
      problemado: 1.5,
      "hindi makatulog": 1.2,
      "di makatulog": 1.2,
      "nalilito": 1
    },
    depressed: {
      malungkot: 1.5,
      nalulungkot: 1.5,
      lungkot: 1.2,
      "ang lungkot": 1.5,
      umiiyak: 1.5,
      iyak: 1,
      "napaiyak": 1.5,
      nasaktan: 1.5,
      "masakit": 1,
      "sobrang sakit": 2,
      "wala na akong gana": 2,
      "walang gana": 1.5,
      "pagod na ako": 1.5,
      "pagod na pagod": 1.5,
      "nag iisa": 1.5,
      "mag isa": 1,
      "walang nagmamahal": 2,
      "walang pakialam": 1.5,
      "iniwan": 1.5,
      "iniwan ako": 2,
      "ayoko na": 1.5,
      "suko na ako": 1.5,
      "wala akong kwenta": 2,
      "nawalan": 1,
      "broken hearted": 2,
      brokenhearted: 2,
      heartbroken: 1.5,
      "miss ko na": 1.2
    },
    jolly: { hahaha: 2, hehe: 1.5, "nakakatawa": 1.5, "tawang tawa": 2, "lt": 1, "laughtrip": 2, "kalokohan": 1 },
    happy: {
      masaya: 1.5,
      "ang saya": 1.5,
      "sobrang saya": 2,
      natutuwa: 1.5,
      tuwang: 1.2,
      "masayang masaya": 2.5,
      salamat: 0.5,
      "ang galing": 1,
      galing: 0.8,
      "proud ako": 1.5,
      "excited na ako": 1.5,
      "kinikilig": 1.5,
      kilig: 1.2
    }
  };
  function detectMood(rawText) {
    var _a;
    const raw = String(rawText);
    const text = normalize(raw);
    const words = text.split(" ").filter(Boolean);
    const scores = { angry: 0, distressed: 0, depressed: 0, jolly: 0, happy: 0 };
    const cues = [];
    for (
      const mood2 of
      /** @type {(keyof typeof CUES)[]} */
      Object.keys(CUES)
    ) {
      for (const [phrase, weight] of [...Object.entries(CUES[mood2]), ...Object.entries((_a = TAGALOG_CUES[mood2]) != null ? _a : {})]) {
        const phraseWords = phrase.split(" ");
        for (const start2 of findAll(words, phraseWords)) {
          const before = words.slice(Math.max(0, start2 - NEGATION_WINDOW), start2);
          const negated = phraseWords.length === 1 && before.some((w) => NEGATIONS.has(w)) && !KEEP_GOING.has(words[start2 - 1]);
          const boost = INTENSIFIERS.has(words[start2 - 1]) ? 1.5 : 1;
          if (negated) {
            const flipped = NEGATED_BECOMES[mood2];
            if (flipped) {
              scores[flipped] += weight * NEGATED_WEIGHT * boost;
              cues.push(`not ${phrase}`);
            }
            continue;
          }
          scores[mood2] += weight * boost;
          cues.push(phrase);
        }
      }
    }
    words.forEach((w, i) => {
      if (NEGATED_POSITIVE.has(w) && words.slice(Math.max(0, i - 2), i).includes("not")) {
        scores.depressed += 1;
        cues.push(`not ${w}`);
      }
    });
    for (const [pattern, mood2, weight] of EMOJI_CUES) {
      const found = raw.match(pattern);
      if (found) {
        scores[mood2] += weight * Math.min(found.length, 3);
        cues.push(...found.slice(0, 3));
      }
    }
    const shouted = (raw.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => !["OK", "BBO", "BPO", "SLA", "FAQ", "USA", "CRM"].includes(w));
    const bangs = (raw.match(/!/g) || []).length;
    if (shouted.length >= 2 || bangs >= 3) {
      if (scores.angry > 0 || scores.happy === 0 && scores.jolly === 0) scores.angry += 0.8;
      else scores.happy += 0.5;
    }
    const crisis = CRISIS.some((re) => re.test(text));
    if (crisis) scores.depressed += 3;
    let mood = (
      /** @type {Mood} */
      "neutral"
    );
    let best = 0;
    for (const [m, score] of Object.entries(scores)) {
      if (score > best) {
        best = score;
        mood = /** @type {Mood} */
        m;
      }
    }
    if (best < MIN_SCORE) mood = "neutral";
    return {
      mood,
      intensity: mood === "neutral" ? null : best >= STRONG_SCORE ? "strong" : "mild",
      scores: roundScores(scores),
      cues,
      crisis
    };
  }
  function findAll(words, phraseWords) {
    const hits = [];
    for (let i = 0; i + phraseWords.length <= words.length; i++) {
      if (phraseWords.every((w, k) => words[i + k] === w)) hits.push(i);
    }
    return hits;
  }
  function roundScores(scores) {
    return (
      /** @type {MoodResult["scores"]} */
      Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round(v * 10) / 10]))
    );
  }
  var MOOD_LABELS = {
    angry: { emoji: "😠", label: "Angry" },
    distressed: { emoji: "😰", label: "Distressed" },
    depressed: { emoji: "😔", label: "Low / depressed" },
    jolly: { emoji: "😄", label: "Jolly" },
    happy: { emoji: "😊", label: "Happy" },
    neutral: { emoji: "😐", label: "Neutral" }
  };

  // src/knowledge.js
  var MIN_KNOWLEDGE_SCORE = 2;
  var SMALL_TALK_LONG_MESSAGE_WORDS = 5;
  var SMALL_TALK_DAMPING = 0.4;
  var CASUAL_SINGLE_WORD_MAX = 4;
  var SHORT_MESSAGE_WORDS = 3;
  const knowledgeKeyCache = new WeakMap();
  function rankKnowledge(text, entries, context = /* @__PURE__ */ new Set()) {
    const words = text.split(" ").filter(Boolean);
    const ranked = [];
    for (const entry of entries) {
      if (entry.requires && !entry.requires.some((r) => containsPhrase(text, normalize(r)) || context.has(normalize(r)))) continue;
      let score = 0;
      let exact = false;
      let keys = knowledgeKeyCache.get(entry);
      if (!keys) { keys = entry.keys.map(normalize); knowledgeKeyCache.set(entry, keys); }
      for (const key of keys) {
        if (!key) continue;
        if (!key.includes(" ") && containsPhrase(text, `my ${key}`)) continue;
        if (entry.casual && !key.includes(" ") && words.length > CASUAL_SINGLE_WORD_MAX) continue;
        if (key === text) {
          score += 3;
          exact = true;
        } else if (key.includes(" ")) {
          if (containsPhrase(text, key)) {
            score += 3;
            exact = true;
          }
        } else if (containsPhrase(text, key)) {
          score += key.length > 3 || words.length <= SHORT_MESSAGE_WORDS ? 2 : 1;
          exact = true;
        } else if (key.length >= 5 && words.some((w) => w.length >= 5 && sharesStem(w, key))) {
          score += 1;
        }
      }
      if (!exact) score = Math.min(score, 1);
      if (entry.smallTalk && words.length > SMALL_TALK_LONG_MESSAGE_WORDS) score *= SMALL_TALK_DAMPING;
      if (score >= MIN_KNOWLEDGE_SCORE) {
        if (entry.engine && entry.overview) score = MIN_KNOWLEDGE_SCORE;
        else if (entry.engine) score += 4;
        ranked.push({ entry, score });
      }
    }
    return ranked.sort((a, b) => b.score - a.score);
  }
  function sharesStem(a, b) {
    const stem = Math.min(a.length, b.length) - 2;
    return stem >= 4 && a.slice(0, stem) === b.slice(0, stem);
  }

  // src/smalltalk.js
  function findTopic(text, entries, names) {
    let best = null;
    entries.forEach((entry, order) => {
      for (const rawKeyword of entry.keywords) {
        const keyword = resolveKeyword(rawKeyword, names);
        if (!keyword || !containsPhrase(text, keyword)) continue;
        const rank = [entry.priority ? 1 : 0, keyword.split(" ").length, keyword.length, -order];
        if (!best || isHigher(rank, best.rank)) best = { entry, keyword, rank };
      }
    });
    if (!best) return null;
    const at = phraseIndex(text, best.keyword);
    const phrase = text.slice(at + best.keyword.length).trim();
    return { entry: best.entry, keyword: best.keyword, phrase };
  }
  // query.js reference workflow: collect targets, resolve overlapping phrases,
  // preserve their input order, and bind each phrase to its own response slot.
  function extractPhraseTargets(text, entries, names) {
    const candidates = [];
    for (const entry of entries) for (const raw of entry.keywords) {
      const keyword = resolveKeyword(raw, names);
      if (!keyword.includes(" ")) continue;
      let from = 0;
      while (from < text.length) {
        const at = text.indexOf(keyword, from);
        if (at < 0) break;
        const end = at + keyword.length;
        if ((at === 0 || text[at - 1] === " ") && (end === text.length || text[end] === " ")) candidates.push({entry, keyword, start: at, end});
        from = end;
      }
    }
    // Specific phrases own their span. A shorter contained key cannot consume it.
    candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || Number(Boolean(b.entry.priority)) - Number(Boolean(a.entry.priority)) || a.start - b.start);
    const targets = [];
    for (const candidate of candidates) if (!targets.some(t => candidate.start < t.end && candidate.end > t.start)) targets.push(candidate);
    targets.sort((a, b) => a.start - b.start);
    return targets.map((t, i) => ({...t, phrase: text.slice(t.end, targets[i + 1]?.start ?? text.length).trim()}));
  }
  function planPhrases(original, entries, names) {
    const text = normalize(original);
    const targets = extractPhraseTargets(text, [...entries, {keywords: ["i want", "i need", "i hope", "i believe", "i think", "i feel", "i am", "i have", "i remember", "i cannot", "i can not", "i do not", "we want", "we need"]}], names);
    if (targets.length < 2) return [original];
    const boundaries = [];
    let previous = targets[0];
    for (const target of targets.slice(1)) {
      const payload = text.slice(previous.end, target.start).trim();
      // Independent subject/predicate phrases can be unpunctuated. Keep nested
      // thoughts and their causes intact: "I think I need...", "because I...".
      if (/^(?:i|we|you) (?:want|need|think|believe|feel|am|have|cannot|can not|do not|remember|hope|would like)\b/.test(target.keyword)
          && payload.split(/\s+/).filter(Boolean).length >= 2
          && !/\b(?:because|that|if|when|unless|whether|said|say|told|ask|asked)\s*$/.test(payload)) {
        boundaries.push(target.start);
        previous = target;
      }
    }
    if (!boundaries.length) return [original];
    // Map normalized word positions back to original spans; keep names, casing
    // and punctuation for display, memory and the existing emotion detector.
    const words = [...original.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)];
    const spans = [];
    for (const word of words) for (const token of normalize(word[0]).split(" ").filter(Boolean)) spans.push({token, start: word.index});
    if (spans.map(w => w.token).join(" ") !== text) return [original];
    const cuts = boundaries.map(at => spans[text.slice(0, at).trim().split(" ").filter(Boolean).length]?.start).filter(at => at > 0);
    const chunks = [];
    let start = 0;
    for (const end of [...new Set(cuts), original.length]) {
      const chunk = original.slice(start, end).replace(/(?:,?\s+(?:and|but|also))\s*$/i, "").trim();
      if (chunk) chunks.push(chunk);
      start = end;
    }
    return chunks;
  }
  function splitConversationParts(original) {
    // Split independent clauses without breaking quoted speech or lists of nouns.
    const candidates = [...original.matchAll(/(?:;\s*|,\s*|\s+(?:and|but|also)\s+)(?=(?:(?:oh|anyway|also)\s+)?(?:i|we|my|our)\b|(?:what|how|where|when|why|can you|do you|have you|have u|do like|do u)\b)/gi)];
    const cuts = candidates.filter(match => {
      const before = original.slice(0, match.index);
      return (before.match(/"/g) || []).length % 2 === 0 && (before.match(/“/g) || []).length === (before.match(/”/g) || []).length;
    });
    const parts = []; let start = 0;
    for (const cut of cuts) { parts.push(original.slice(start, cut.index).trim()); start = cut.index + cut[0].length; }
    parts.push(original.slice(start).trim());
    return parts.filter(Boolean);
  }
  function resolveKeyword(keyword, { botName, userName }) {
    if (keyword === "{botName}") return normalize(botName);
    if (keyword === "{userName}") return userName ? normalize(userName) : "";
    return normalize(keyword);
  }
  function isHigher(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
  }
  function composeReply(entry, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const random = (_a = ctx.random) != null ? _a : Math.random;
    const wantsPhrase = ctx.phrase.trim() !== "";
    const safeReplies = entry.replies.filter(o => !usesPhrase(o, entry));
    const fitting = safeReplies.filter((o) => fitsMood(o, entry, ctx.mood)).filter((o) => !ctx.gentle || !DOUBTING.test(o.opener));
    const choose = ctx.chooseFresh || ((list) => pick(list, random));
    if (!safeReplies.length) return choose(["What would you like to explore about that?", "Which part matters most to you?", "We can look at what would be useful for you next."]);
    const option = (_b = choose(fitting.length ? fitting : safeReplies)) != null ? _b : { opener: "" };
    const gentleList = (list) => list ? list.filter(t => !/\{phrase\}/.test(t) && (!ctx.gentle || !DOUBTING.test(t))) : list;
    const parts = [
      option.opener,
      choose(gentleList((_c = option.followUps) != null ? _c : entry.followUps)),
      choose(gentleList((_d = option.thoughts) != null ? _d : entry.thoughts)),
      choose(gentleList((_e = option.feelings) != null ? _e : entry.feelings))
    ].filter(Boolean);
    const emoji = (_g = pick(emojiForMood((_f = entry.emoji) != null ? _f : [], ctx.mood), random)) != null ? _g : "";
    const sentence = fill(parts.join(" "), {
      keyword: ctx.keyword,
      reflectedKeyword: reflect(ctx.keyword, ctx.reflections),
      phrase: reflect(ctx.phrase, ctx.reflections),
      botName: ctx.botName,
      userName: ctx.userName || "you",
      topic: (_h = ctx.topic) != null ? _h : ctx.keyword
    });
    return tidy(`${sentence} ${emoji}`);
  }
  function usesPhrase(option, entry) {
    var _a, _b;
    const texts = [option.opener, ...(_b = (_a = option.followUps) != null ? _a : entry.followUps) != null ? _b : []];
    return texts.some((t) => t.includes("{phrase}"));
  }
  var DOUBTING = /\b(really true|for sure|are you sure|you positive|you certain|how can you say|do you really|why do you say|is that so|maybe you are not|not .* correct|what makes you think|prove|doubt|lying|nonsense|wish you were|you claim|so you say|is that what you believe|you will never know|succeed in|lacked confidence|is it possible you|perhaps you hope|oh I am|exactly)\b/i;
  var SAD_WORDS = /\b(sorry|difficult|sad|hurt|bother|troubl|worr)/i;
  var GLAD_WORDS = /\b(enjoy|proud|glad|great|wonderful|like being|happy)/i;
  function fitsMood(option, entry, mood) {
    var _a, _b;
    if (!mood || mood === "neutral") return true;
    const text = [option.opener, ...(_b = (_a = option.followUps) != null ? _a : entry.followUps) != null ? _b : []].join(" ");
    if (mood === "happy" || mood === "jolly") return !SAD_WORDS.test(text);
    return !GLAD_WORDS.test(text);
  }
  var CHEERFUL_EMOJI = /[😄😊😁😀😃🤩🎉😎😂🤣🌟✨😜🥳]/u;
  function emojiForMood(emoji, mood) {
    if (mood === "angry" || mood === "distressed" || mood === "depressed") return emoji.filter((e) => !CHEERFUL_EMOJI.test(e));
    return emoji;
  }

  // src/empathy.js
  var PEOPLE = [
    "best friend",
    "older brother",
    "younger brother",
    "older sister",
    "younger sister",
    "ex boyfriend",
    "ex girlfriend",
    "brother",
    "sister",
    "mother",
    "father",
    "mom",
    "dad",
    "parents",
    "wife",
    "husband",
    "partner",
    "boyfriend",
    "girlfriend",
    "fiance",
    "friend",
    "friends",
    "boss",
    "manager",
    "supervisor",
    "coworker",
    "coworkers",
    "colleague",
    "colleagues",
    "son",
    "daughter",
    "kids",
    "children",
    "family",
    "teacher",
    "grandmother",
    "grandfather",
    "grandma",
    "grandpa",
    "aunt",
    "uncle",
    "cousin",
    "roommate",
    "neighbor",
    "client",
    "team",
    "staff"
  ];
  var EMPATHY_LINES = {
  "depressed": [
    "I'm sorry this is painful. You don't have to sort everything out right now.",
    "Your feelings deserve care. We can take this at your pace."
  ],
  "distressed": [
    "Let's take this one step at a time.",
    "You don't need every answer right now. We can focus on one manageable part."
  ],
  "angry": [
    "That sounds frustrating. Let's give you some space to decide what would help.",
    "I want to help you find a way forward that works for you."
  ],
  "happy": [
    "That's lovely to hear!",
    "I'm glad there's something worth celebrating."
  ],
  "jolly": [
    "It's good to share a lighthearted moment!",
    "There's room to enjoy the good moments, too."
  ]
};
  var MIXED_LINES = [
  "Both feelings can matter at the same time.",
  "You don't need to force one feeling to cancel out the other."
];
  var GOOD_EVENT = /\b(pregnant|expecting|baby|married|engaged|promoted|new job|graduat\w*|wedding|new house|got accepted|got hired|passed)\b/;
  var FEELING_ONLY_LINES = {
    depressed: [
      "I'm so sorry you're feeling this way.",
      "I'm really sorry you're feeling down. I'm right here with you.",
      "That sounds really heavy, {userName}. You can take your time with this.",
      "I'm sorry you're hurting. Your feelings matter, and so do you."
    ],
    distressed: [
      "I'm sorry you're feeling this way. That's a lot to hold, and it's okay.",
      "That sounds really stressful. I'm here with you.",
      "It's okay to feel anxious, {userName}. Let's take it slowly, one thing at a time."
    ],
    angry: [
      "I'm sorry you're feeling so upset. That's completely understandable.",
      "It's okay to feel angry. I'm here to listen.",
      "That sounds really frustrating, {userName}. I'm sorry."
    ],
    happy: ["That's wonderful to hear! I'm so happy for you. 😊", "Yay, I love that! 😊", "Your good mood is contagious! 😊"],
    jolly: ["Haha, I love your energy! 😄", "You've made me smile! 😄"]
  };
  var FILIPINO_FEELING_LINES = {
    depressed: ["Naiintindihan kita. I'm so sorry you're going through this. Nandito lang ako.", "Yakap! 🤗 I'm really sorry you're feeling this way. Nandito lang ako, makikinig ako."],
    distressed: ["Kaya mo 'yan. It's okay to feel this way. Isa-isa lang, one step at a time. Nandito ako.", "Hinga muna tayo nang malalim. I'm here with you."],
    angry: ["Naiintindihan kita, nakakainis talaga 'yan. I'm sorry you had to deal with that.", "Valid 'yang nararamdaman mo. I'm here to listen."],
    happy: ["Ang saya naman! I'm so happy for you! 😊", "Wow, ang ganda niyan! 😊"],
    jolly: ["Hahaha, natawa rin ako! 😄", "Ang kulit! 😄"]
  };
  var FILIPINO_ACK_LINES = ["Salamat sa pag-share. Thank you for telling me.", "Naiintindihan ko. Thank you for sharing that with me."];
  var CARE_TIPS = {
    depressed: [
      "If it helps, try one small kind thing for yourself today: a glass of water, a short walk, or a message to someone you trust. 💛",
      "Be gentle with yourself today. Even resting counts as taking care of yourself. 💛"
    ],
    distressed: [
      "If it helps, try this: breathe in for 4, hold for 4, and breathe out slowly for 6. Doing that a few times can calm your body. 🌿",
      "If your mind is racing, it can help to write down everything that's worrying you, then pick just one small thing to do first. 🌿"
    ],
    angry: [
      "If it helps, give yourself a few minutes before responding to anyone. A short walk or a few slow breaths can take the edge off. 🌿"
    ]
  };
  var FEELING_BETTER_LINES = [
    "I'm really glad to hear you're feeling a bit better. 😊",
    "That makes me so happy to hear. I'm glad things are looking up! 😊"
  ];
  var CHECK_IN_LINES = [
    "By the way, I've been thinking about what you shared earlier. How are you feeling about {topic} now?",
    "Before I forget, how are you holding up with {topic}?"
  ];
  var PERSON_LINES = [
  "Thank you for trusting me with this.",
  "We can focus on what would help you most."
];
  var PERSON_LINES_LONG = ["Thank you for telling me about your {person}.", "It sounds like your {person} is an important part of this."];
  var STATEMENT_LINES = [
  "Thank you for sharing that with me.",
  "What would be useful to explore next?"
];
  var ACK_LINES = ["Thanks for sharing that with me.", "That's interesting, thank you for telling me.", "I appreciate you sharing that."];
  var QUESTION_LINES = [
  "I don't have enough information for a confident answer yet. Which part would you like help with?",
  "I can help you explore the options. What outcome would be useful to you?"
];
  var REQUEST_LINES = ["I may need a little more detail to help. What outcome are you looking for?", "I can help you explore Beyond AI products and services, or work through what matters to you."];
  var REQUEST = /^(?:please )?(?:tell me (?:more )?about|explain|describe|teach me about|what do you know about|can you tell me about|talk about)\s+(.+)$/;
  var COMPANY_QUESTION_LINES = [
    "You asked “{quoted}”. I don't want to give you a wrong answer, so that's one for the team. They'll be happy to help.",
    "Great question: “{quoted}”. I'm not 100% sure, so I'd rather the team answer it properly for you."
  ];
  var FOLLOW_UP_QUESTIONS = {
    depressed: ["How have you been coping with all of this?", "Is there someone you trust that you can talk to about it?", "Would you like to tell me a bit more? I'm here to listen."],
    distressed: ["What's worrying you the most right now?", "Is there anything that would help you feel a little calmer right now?"],
    angry: ["Would you like to tell me what happened?", "What would help make this better for you?"],
    happy: ["What made it so good?", "How are you celebrating?"],
    jolly: ["What else is making you smile today?"],
    person: ["How are things between you and your {person}?", "How do you feel about your {person} right now?", "Would you like to tell me more about your {person}?"],
    statement: ["I'd love to hear more about that!", "Tell me more, I'm all ears!", "What else is on your mind today?"]
  };
  var ALSO_MENTIONED = "You also mentioned {list}.";
  var MAX_PIECES = 6;
  var MAX_REFLECTED_WORDS = 16;
  var SUMMARY_WORDS = 8;
  var FILLER_START = /^(?:(?:like|um+|uh+|hmm+|so|well|honestly|basically|actually|anyway|okay|ok|you know|i mean|ha(?:ha)+|he(?:he)+|lol|lmao|laughing out loud|oh|wow|and|but|also)\s+)+/;
  var PERSONAL = /\b(i|me|my|myself|we|our|us)\b/;
  var QUESTION_START2 = /^(do|does|did|can|could|would|will|is|are|am|was|were|what|how|why|who|whom|where|when|which|should|have|has)\b/;
  var GENERIC_KEYWORDS = /* @__PURE__ */ new Set(["i", "me", "myself", "you", "yourself", "my", "mine", "your", "yours", "what", "how", "who", "where", "when", "why", "is", "are", "was", "were", "if", "many", "more", "much", "all", "any", "anything", "think", "thought", "personal", "own", "one", "someone", "which", "whatever", "however", "really", "because", "cause", "always", "often", "sometimes", "like", "name", "well", "fine", "it is", "this is", "that is"]);
  var IMPORTANCE = { feeling: 5, person: 4, "company-question": 4, question: 3, smalltalk: 3, statement: 2, ack: 1 };
  function readSentence(sentence, i) {
    const text = sentence.text.replace(FILLER_START, "");
    return {
      i,
      original: sentence.original,
      text,
      mood: detectMood(sentence.original),
      person: findPerson(text),
      personal: PERSONAL.test(text),
      question: /\?\s*$/.test(sentence.original) || QUESTION_START2.test(text)
    };
  }
  function listen(sentences, ctx) {
    var _a, _b, _c, _d, _e;
    const random = (_a = ctx.random) != null ? _a : Math.random;
    const used = /* @__PURE__ */ new Set();
    const notes = sentences.map(readSentence);
    const pieces = [];
    for (const note of notes) {
      if (!note.text) continue;
      if ((_b = ctx.skip) == null ? void 0 : _b.has(note.i)) continue;
      const answered = (_c = ctx.answered) == null ? void 0 : _c.has(note.i);
      if (answered && note.mood.mood === "neutral" && !note.person) continue;
      const piece = respondTo(note, notes, ctx, used, random);
      if (!piece) continue;
      if (piece.mergedPrev) {
        const prev = pieces[pieces.length - 1];
        if (prev && prev.i === note.i - 1 && (prev.kind === "statement" || prev.kind === "ack")) pieces.pop();
      }
      pieces.push({ ...piece, i: note.i, note });
    }
    if (pieces.length === 0) return null;
    let kept = pieces;
    let summary = "";
    const feelings = pieces.filter((p) => p.kind === "feeling");
    const strongest = feelings.sort((a, b) => strength(b.note) - strength(a.note))[0];
    const dominant = (
      /** @type {Mood} */
      strongest ? strongest.note.mood.mood : "neutral"
    );
    const person = (_d = notes.find((n) => n.person)) == null ? void 0 : _d.person;
    const everyday = pieces.some((p) => p.kind === "statement" || p.kind === "ack");
    let key = dominant !== "neutral" ? dominant : person ? "person" : everyday ? "statement" : "";
    if (person && (dominant === "depressed" || dominant === "angry") && random() < 0.5) key = "person";
    const lastText = (summary || kept[kept.length - 1].text).trim();
    const closing = key && !lastText.endsWith("?") ? fill((_e = pick(FOLLOW_UP_QUESTIONS[key], random)) != null ? _e : "", { person: person != null ? person : "them" }) : "";
    return {
      text: [...kept.map((p) => p.text), summary].filter(Boolean).join(" "),
      /** Each response with the index of the sentence it answers, so it can be woven in with other answers. */
      pieces: [...kept.map((p) => ({ i: p.i, text: p.text })), ...summary ? [{ i: Infinity, text: summary }] : []],
      closing,
      kinds: kept.map((p) => p.kind),
      mood: dominant,
      person
    };
  }
  function respondTo(note, notes, ctx, used, random) {
    var _a, _b, _c;
    const reflected = (text) => shorten(readable(reflect(text, ctx.reflections)));
    const userName = (_a = ctx.names) == null ? void 0 : _a.userName;
    const choose = (lines, values) => {
      var _a2;
      const usable = lines.filter((t) => userName || !t.includes("{userName}"));
      const options = usable.filter((t) => !used.has(t));
      const template = (_a2 = (ctx.chooseFresh || ((list) => pick(list, random)))(options.length ? options : usable)) != null ? _a2 : "";
      used.add(template);
      return fillCase(template, { userName, ...values });
    };
    if (isFilipino(note.text)) {
      if (note.mood.mood !== "neutral") return { kind: "feeling", text: choose(FILIPINO_FEELING_LINES[note.mood.mood], {}) };
      if (note.text.split(" ").length >= 3) return { kind: "ack", text: choose(FILIPINO_ACK_LINES, {}) };
    }
    if (note.mood.mood !== "neutral" && EMPATHY_LINES[note.mood.mood]) {
      if (((_b = ctx.skip) == null ? void 0 : _b.has(note.i - 1)) && isFeelingOnly(note)) return null;
      const withPrev = ((_c = ctx.skip) == null ? void 0 : _c.has(note.i - 1)) ? note.text : withContext(note, notes);
      const merged = withPrev !== note.text;
      if (!merged && isFeelingOnly(note)) return { kind: "feeling", text: choose(FEELING_ONLY_LINES[note.mood.mood], {}) };
      const negative = ["depressed", "distressed", "angry"].includes(note.mood.mood);
      if (negative && GOOD_EVENT.test(withPrev)) return { kind: "feeling", mergedPrev: merged, text: choose(MIXED_LINES, { reflected: reflected(withPrev) }) };
      return { kind: "feeling", mergedPrev: merged, text: choose(EMPATHY_LINES[note.mood.mood], { reflected: reflected(withPrev) }) };
    }
    if (note.person && note.personal) {
      const fromPerson = note.text.slice(Math.max(0, note.text.search(new RegExp(`\\b(my|our) ${note.person}\\b`)))).trim();
      const length = fromPerson.split(" ").length;
      const short = length >= 3 && length <= MAX_REFLECTED_WORDS;
      const lines = short ? PERSON_LINES : PERSON_LINES_LONG;
      return { kind: "person", text: choose(lines, { reflected: reflected(fromPerson), person: note.person }) };
    }
    const intent = conversationalIntent(note.text);
    if (intent && !note.question) {
      const text = choose(intent.openers, { reflected: reflected(intent.phrase) });
      return { kind: "statement", text };
    }
    const topic = ctx.lizaTemplates !== false && ctx.responses && ctx.names ? findTopic(note.text, ctx.responses, ctx.names) : null;
    const fits = topic && (topic.entry.priority || !GENERIC_KEYWORDS.has(topic.keyword));
    const request = note.text.match(REQUEST);
    if (request) {
      const topicText = readable(request[1]).trim();
      if (topicText) return { kind: "question", text: choose(REQUEST_LINES, { topic: topicText }) };
    }
    if (note.question) {
      if (fits && topic) return { kind: "smalltalk", text: liza(topic, note, ctx, random) };
      const quoted = quote(note.original);
      const aboutUs = /\b(you|your|you guys|your team|your company|beyond ai|bbo)\b/i.test(note.original);
      return { kind: aboutUs ? "company-question" : "question", text: choose(aboutUs ? COMPANY_QUESTION_LINES : QUESTION_LINES, { quoted }) };
    }
    if (note.personal && note.text.split(" ").length >= 3) {
      if (fits && topic && topic.keyword.includes(" ")) return { kind: "smalltalk", text: liza(topic, note, ctx, random) };
      return { kind: "statement", text: choose(STATEMENT_LINES, { reflected: reflected(note.text) }) };
    }
    if (fits && topic && (topic.entry.priority || topic.keyword.includes(" ") || note.text.split(" ").length < 3)) {
      return { kind: "smalltalk", text: liza(topic, note, ctx, random) };
    }
    if (note.text.split(" ").length >= 3) return { kind: "ack", text: choose(ACK_LINES, { reflected: reflected(note.text) }) };
    if (fits && topic) return { kind: "smalltalk", text: liza(topic, note, ctx, random) };
    return null;
  }
  // Inspired by query.js: retain the phrase attached to each matching intent.
  // Each opener is a complete grammatical template; fragments are never joined
  // across unrelated clauses or randomly paired with incompatible opinions.
  function conversationalIntent(text) {
    const patterns = [
      { re: /^i (?:want|need|hope|would like)\s+(.+)$/, openers: [
        "What would help you move forward?",
        "What matters most to you about this goal?",
        "What have you tried so far?"
      ] },
      { re: /^i (?:cannot|can not|do not know how to|am not sure how to)\s+(.+)$/, openers: [
        "Which part is getting in the way?",
        "What approaches have you tried so far?",
        "We can take this step by step. Where do you get stuck?"
      ] },
      { re: /^i (?:think|believe|guess|suppose)(?: that)?\s+(.+)$/, openers: [
        "What led you to that view?",
        "What experiences shaped your view?",
        "Which part matters most to you?"
      ] },
      { re: /^i (?:remember|recalled)\s+(.+)$/, openers: [
        "What stands out about that experience?",
        "What brought that memory to mind?",
        "What would you like to explore about that memory?"
      ] }
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern.re);
      if (match && match[1].split(" ").length <= 40) return { phrase: match[1], openers: pattern.openers };
    }
    return null;
  }
  function quote(original) {
    const words = original.replace(/^\s*(and|also|so|but|plus)\b[,\s]*/i, "").replace(/[?!.\s]+$/, "").split(/\s+/);
    const short = words.slice(0, 14).join(" ") + (words.length > 14 ? "…" : "");
    return short.charAt(0).toUpperCase() + short.slice(1);
  }
  function isFilipino(text) {
    var _a;
    const hits = text.match(/\b(ako|ko|ka|mo|ikaw|siya|kami|tayo|sila|ang|ng|nang|mga|sa|na|naman|lang|po|talaga|sobrang|hindi|wala|ayoko|kasi|pero|yung|ito|iyan|dito|ngayon)\b/g);
    return ((_a = hits == null ? void 0 : hits.length) != null ? _a : 0) >= 2;
  }
  function isFeelingOnly(note) {
    const rest = note.text.replace(/\b(i|am|i am|feel|feeling|so|very|really|just|kind of|kinda|a bit|today|now|right now|too|honestly|is|it|me|makes)\b/g, " ").trim().split(/\s+/).filter(Boolean);
    return rest.length <= 2 && note.text.split(" ").length <= 6;
  }
  function liza(topic, note, ctx, random) {
    return composeReply(topic.entry, { ...topic, ...ctx.names, mood: note.mood.mood, gentle: ctx.gentle, reflections: ctx.reflections, chooseFresh: ctx.chooseFresh, random });
  }
  function strength(note) {
    return note.mood.mood === "neutral" ? 0 : Math.max(...Object.values(note.mood.scores));
  }
  function summarise(note, ctx) {
    const words = readable(reflect(note.text, ctx.reflections)).split(" ");
    const short = words.slice(0, SUMMARY_WORDS).join(" ").replace(/\s+(and|but|so|because|or|the|a|to|of|with)$/i, "") + (words.length > SUMMARY_WORDS ? "…" : "");
    return note.question ? `asked ${short}` : `that ${short}`;
  }
  function withContext(note, notes) {
    const prev = notes[note.i - 1];
    if (!prev || note.text.split(" ").length > 4) return note.text;
    if (prev.mood.mood !== "neutral" || !prev.personal || prev.person || prev.question || prev.text.split(" ").length > 10) return note.text;
    return `${prev.text} and ${note.text}`;
  }
  function findPerson(text) {
    let best;
    let bestAt = Infinity;
    for (const p of PEOPLE) {
      for (const owner of ["my", "our"]) {
        const at = ` ${text} `.indexOf(` ${owner} ${p} `);
        if (at !== -1 && at < bestAt) {
          best = p;
          bestAt = at;
        }
      }
    }
    return best;
  }
  function readable(text) {
    return text.replace(/\bcan not\b/g, "can't").replace(/\bdo not\b/g, "don't").replace(/\bdoes not\b/g, "doesn't").replace(/\bdid not\b/g, "didn't").replace(/\bis not\b/g, "isn't").replace(/\bare not\b/g, "aren't").replace(/\bwas not\b/g, "wasn't").replace(/\bwill not\b/g, "won't").replace(/\bhave not\b/g, "haven't").replace(/\bwho tell\b/g, "who told").replace(/\byou are\b/g, "you're").replace(/\bi\b/g, "I").replace(/\bI am\b/g, "I'm").trim();
  }
  function shorten(text) {
    const words = text.split(" ");
    if (words.length <= MAX_REFLECTED_WORDS) return text;
    return words.slice(0, MAX_REFLECTED_WORDS).join(" ").replace(/\s+(and|but|so|because|or|the|a|to|of)$/i, "");
  }
  function fillCase(template, values) {
    const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    return fill(template.replace(/\{Reflected\}/g, cap(values.reflected)), values).replace(/\s+/g, " ").trim();
  }
  function listOf(items) {
    return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  }

  // src/time.js
  function detectTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }
  function localParts(date, timeZone) {
    const parts = Object.fromEntries(
      safeFormat(timeZone, { hour: "numeric", minute: "numeric", weekday: "long", hourCycle: "h23" }).formatToParts(date).map((p) => [p.type, p.value])
    );
    return { hour: Number(parts.hour) % 24, minute: Number(parts.minute), weekday: parts.weekday };
  }
  function formatTime(date, timeZone) {
    return safeFormat(timeZone, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  function formatDate(date, timeZone) {
    return safeFormat(timeZone, { weekday: "long", month: "long", day: "numeric" }).format(date);
  }
  function partOfDay(hour) {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 22) return "evening";
    return "night";
  }
  function timeGreeting(clock) {
    const part = partOfDay(localParts(clock.now(), clock.userTimeZone).hour);
    return part === "night" ? "Hi there, you're up late!" : `Good ${part}!`;
  }
  function isLateNight(clock) {
    const { hour } = localParts(clock.now(), clock.userTimeZone);
    return hour >= 0 && hour < 5;
  }
  function timeValues(clock) {
    var _a;
    const now = clock.now();
    const hub = clock.hub;
    return {
      timeGreeting: timeGreeting(clock),
      userTime: formatTime(now, clock.userTimeZone),
      userDate: formatDate(now, clock.userTimeZone),
      hubName: (_a = hub == null ? void 0 : hub.name) != null ? _a : "",
      hubTime: hub ? formatTime(now, hub.timeZone) : "",
      hubPart: hub ? partOfDay(localParts(now, hub.timeZone).hour) : ""
    };
  }
  function timeQuestion(text) {
    if (/\b(time|what time).*\b(manila|philippines|ph|there|your side|your end)\b|\b(manila|philippines|philippine) time\b/.test(text)) return "hub-time";
    if (/\b(are you|is your team|is the team|is anyone|is someone) (open|available|working|online|awake|there)( now| right now| today)?\b|\bopen (now|today|right now)\b/.test(text)) return "available";
    if (/\bwhat time is it\b|\bwhat is the time\b|\bcurrent time\b|\bwhat time now\b|\btime is it\b/.test(text)) return "time";
    if (/\bwhat (is )?(the )?date\b|\btoday date\b|\bwhat day is (it|today)\b|\bwhat is today\b/.test(text)) return "date";
    return null;
  }
  function timeAnswer(kind, clock, botName = "I") {
    const v = timeValues(clock);
    const sameZone = !clock.hub || clock.hub.timeZone === clock.userTimeZone;
    switch (kind) {
      case "time":
        return sameZone || !clock.hub ? `It's ${v.userTime} right now.` : `It's ${v.userTime} where you are, and ${v.hubTime} in ${v.hubName}.`;
      case "date":
        return `Today is ${v.userDate}.`;
      case "hub-time":
        if (!clock.hub) return `It's ${v.userTime} right now.`;
        return sameZone ? `It's ${v.hubTime} in ${v.hubName} right now.` : `It's ${v.hubTime} in ${v.hubName} right now (${v.hubPart} there). For you it's ${v.userTime}.`;
      case "available":
        return `${botName === "I" ? "I'm" : `${botName} is`} here around the clock. ${clock.hub ? `It's ${v.hubTime} in ${v.hubName} right now. ` : ""}Our teams work the hours your operation needs, so coverage is planned around your time zone.`;
    }
  }
  function safeFormat(timeZone, options) {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone, ...options });
    } catch {
      return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options });
    }
  }

  // src/business.js
  var BUSINESS_TYPES = {
    "hotels and hospitality": ["vacation rental", "bed and breakfast", "hotel", "resort", "inn", "hostel", "airbnb", "guesthouse", "restaurant", "cafe", "travel agency", "tour company"],
    "e-commerce": ["online store", "online shop", "shopify store", "amazon store", "ecommerce store", "e commerce store", "ecommerce business", "e commerce business", "ecommerce brand", "e commerce brand", "dropshipping business", "ecommerce", "e commerce"],
    retail: ["retail store", "boutique", "store", "shop"],
    "real estate": ["real estate agency", "real estate brokerage", "real estate business", "brokerage", "realty"],
    "property management": ["property management company", "property management", "rental properties"],
    insurance: ["insurance agency", "insurance company", "insurance business"],
    "financial services": ["accounting firm", "lending company", "fintech", "bank", "financial services firm", "bookkeeping firm"],
    "healthcare administration": ["dental clinic", "medical practice", "clinic", "hospital", "pharmacy", "healthcare company"],
    technology: ["saas company", "software company", "tech company", "startup", "app", "saas", "it company"],
    "professional services": ["law firm", "marketing agency", "digital agency", "consulting firm", "agency", "consultancy"],
    "home services": ["cleaning company", "plumbing company", "roofing company", "hvac company", "landscaping company", "home services company", "construction company"],
    travel: ["airline", "travel company"],
    logistics: ["logistics company", "trucking company", "freight company", "delivery company", "courier"],
    education: ["university", "college", "school", "training center", "academy", "review center"],
    government: ["government agency", "lgu", "local government", "city hall", "municipality", "barangay", "government office"],
    "non-profit": ["ngo", "non profit", "nonprofit", "foundation", "charity"],
    manufacturing: ["manufacturing company", "factory", "plant", "manufacturer"],
    "BPO and call centers": ["call center", "bpo", "contact center"]
  };
  var OWNERSHIP = [
    /\b(?:i|we) (?:run|own|manage|operate|started|founded|have|opened)(?: an?| the| my| our| two| three| several| a small| a big| a few)? ((?:\w+ ){0,2}?)(KW)\b/,
    /\b(?:my|our) (?:own |small |little |family |new |growing )?(KW)\b/,
    /\bwe are an? (?:\w+ ){0,2}?(KW)\b/,
    /\bi work (?:at|for) an? (?:\w+ ){0,2}?(KW)\b/
  ];
  function extractBusiness(raw, text) {
    const facts = { pains: [], buying: false };
    for (const [industry, words] of Object.entries(BUSINESS_TYPES)) {
      for (const word of words) {
        if (OWNERSHIP.some((re) => new RegExp(re.source.replace("KW", escape(word))).test(text))) {
          facts.business = word.replace(/\be ?commerce\b/, "e-commerce");
          facts.industry = industry;
          break;
        }
      }
      if (facts.business) break;
    }
    const place = String(raw).match(/\b(?:based in|located in|we are in|we're in|i am in|i'm in|from|in) ((?:[A-Z][a-zA-Z]+)(?: [A-Z][a-zA-Z]+)?)\b/);
    const NOT_PLACES = /^(I|The|My|Our|We|You|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|English|Spanish|Tagalog|Love|Charge)\b/;
    if (place && !NOT_PLACES.test(place[1])) facts.location = place[1];
    const staff = text.match(/\b(\d+)\s*(?:full time |part time )?(employees|staff|people|workers|agents|team members|person team)\b/);
    const teamOf = text.match(/\bteam of (\d+)\b/);
    const want = text.match(/\b(?:need|want|looking for|hire|hiring|get)\s+(?:about |around |maybe )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:more |new |full time |part time )?(agents|people|staff|assistants|reps|representatives|virtual assistants|vas|persons|employees)\b/);
    if (want) facts.wantedTeam = toNumber(want[1]);
    else if (staff) facts.size = `about ${staff[1]} ${staff[2] === "person team" ? "people" : staff[2]}`;
    else if (teamOf) facts.size = `a team of ${teamOf[1]}`;
    else if (/\b(small business|small company|small team|just me|solo|one man|sole proprietor)\b/.test(text)) facts.size = "a small business";
    const timeline = text.match(/\b(asap|as soon as possible|immediately|right away|this week|next week|this month|next month|this quarter|next quarter|next year|in \d+ (?:days|weeks|months)|within \d+ (?:days|weeks|months))\b/);
    if (timeline) facts.timeline = timeline[1] === "asap" ? "as soon as possible" : timeline[1];
    const PAINS = {
      "too much work": /\b(swamped|overwhelmed|drowning|overloaded|can not keep up|backlog|too much work|stretched thin)\b/,
      "staff turnover": /\b(turnover|staff (quit|left)|people (quit|left)|employees (quit|left)|keep losing staff)\b/,
      "high costs": /\b(too expensive|costs? (are|is) (too )?high|cut costs|reduce costs|save money|tight budget|budget is small|overhead)\b/,
      "hiring is hard": /\b(can not find|hard to (find|hire)|hiring is (hard|difficult)|no applicants)\b/,
      "slow responses": /\b(slow (response|reply)|customers (are )?waiting|missed calls|unanswered|nobody answers)\b/,
      "security worries": /\b(hacked|breach|data leak|ransomware|phishing|malware|cyber ?attack|security (issue|problem|concern|risk)s?)\b/,
      "old systems": /\b(legacy|outdated|old system|old software|slow system|servers? (keeps? )?(crashing|down)|downtime)\b/,
      "manual work": /\b(manual(ly)?|spreadsheets?|excel|paperwork|on paper|by hand|repetitive tasks?)\b/,
      "HR and payroll headaches": /\b(payroll|attendance|leave requests?|hr (is|process|work)|employee records)\b/,
      "too many calls": /\b(too many calls|phones? (keep )?ringing|call volume|missed calls)\b/,
      "skills gap": /\b(do not know (ai|how to use ai)|learn ai|upskill|no developers|need developers|no it team|no tech team)\b/
    };
    for (const [pain, re] of Object.entries(PAINS)) if (re.test(text)) facts.pains.push(pain);
    facts.buying = /\b(we need|i need a team|looking for|want to hire|ready to|how soon can|when can (we|you) start|can (we|you) start|interested in|sign up|get started|send (me )?a (quote|proposal)|let us do it|book a (call|consultation)|move forward)\b/.test(text);
    return facts;
  }
  function mergeProfile(profile, facts) {
    var _a, _b;
    const out = { ...profile, pains: [.../* @__PURE__ */ new Set([...(_a = profile.pains) != null ? _a : [], ...facts.pains])], needs: (_b = profile.needs) != null ? _b : [] };
    for (const key of ["business", "industry", "location", "size", "wantedTeam", "timeline"]) {
      if (facts[key] !== void 0) out[key] = facts[key];
    }
    out.buying = Boolean(profile.buying || facts.buying);
    return out;
  }
  function describeProfile(profile, needLabels = {}) {
    var _a, _b;
    const parts = [];
    if (profile.business) parts.push(`${article(profile.business)} ${profile.business}${profile.location ? ` in ${profile.location}` : ""}`);
    else if (profile.location) parts.push(`based in ${profile.location}`);
    if (profile.size) parts.push(profile.size);
    if ((_a = profile.needs) == null ? void 0 : _a.length) parts.push(`interested in ${listOf2(profile.needs.map((n) => {
      var _a2;
      return (_a2 = needLabels[n]) != null ? _a2 : n;
    }))}`);
    if (profile.wantedTeam) parts.push(`looking for ${profile.wantedTeam} ${profile.wantedTeam === 1 ? "person" : "people"}`);
    if ((_b = profile.pains) == null ? void 0 : _b.length) parts.push(`dealing with ${listOf2(profile.pains)}`);
    if (profile.timeline) parts.push(`hoping to start ${profile.timeline}`);
    return parts;
  }
  function asksForSummary(text) {
    return /\b(what do you know about (me|us|my business|our business)|what have i told you|summari[sz]e|recap|what did i say)\b/.test(text);
  }
  var NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  function toNumber(word) {
    var _a;
    return (_a = NUMBERS[word]) != null ? _a : Number(word);
  }
  function article(word) {
    return /^[aeiou]/.test(word) ? "an" : "a";
  }
  function escape(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function listOf2(items) {
    return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  }

  // src/bot.js
  var DEFAULT_MOOD_LINES = {
    angry: ["I can hear that you're angry.", "That sounds really frustrating.", "I understand why that would make you upset."],
    distressed: ["That sounds stressful. Let's take it one step at a time.", "I can tell this is weighing on you.", "Take a slow breath. I'm here with you."],
    depressed: ["I'm sorry you're feeling this way.", "That sounds heavy. Thank you for telling me.", "You can take your time with this."],
    jolly: ["Haha, I like your energy!", "You're in a playful mood!", "😄 Good one."],
    happy: ["That's great to hear!", "I love that.", "Glad you're feeling good!"]
  };
  var DEFAULT_MOOD_PROMPTS = {
    angry: ["What happened that made you so angry?", "Tell me what set this off.", "Who or what are you angry at?"],
    distressed: ["What's worrying you the most right now?", "What would help you feel a little safer right now?", "Do you want to tell me what's causing the stress?"],
    depressed: ["How long have you been feeling like this?", "Do you want to talk about what's making you feel low?", "Is there someone close to you who knows how you're feeling?"],
    jolly: ["What's got you laughing?", "Tell me the funny part!"],
    happy: ["What's making you happy today?", "Tell me more, what went well?"]
  };
  var FEELS_BETTER = /\b(feel(ing)? better|better now|okay now|ok now|fine now|good now|i am okay now|much better|medyo okay na|okay na ako|ayos na ako|gumaan)\b/;
  var MAX_TOPICS_PER_ANSWER = 4;
  var TOPICS_PER_SENTENCE = 2;
  var MAX_ACTIONS = 4;
  var SUPPORT_NUDGE_AFTER = 3;
  var DEFAULT_SUPPORT_NUDGE = "It might help to talk with someone you trust, or a counsellor, about how you've been feeling. You don't have to carry this alone.";
  var DEFAULT_CRISIS_MESSAGE = "I'm really sorry you're feeling this much pain. You deserve support right now.\nIf you are in danger, please call your local emergency number.\nIn the Philippines you can call the NCMH Crisis Hotline at 1553 (free, 24/7).\nIf you can, reach out to someone you trust and let them know how you're feeling.";
  function createBot(options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x;
    const random = (_a = options.random) != null ? _a : Math.random;
    const recentTemplates = [];
    let rememberedWording = () => "";
    function chooseFresh(list) {
      if (!list || !list.length) return undefined;
      const history = rememberedWording();
      const fresh = list.filter(item => !recentTemplates.includes(item) && !history.includes(normalize(item)));
      // When a short bank is exhausted, revisit its least recently used wording
      // rather than falling straight back to a random repeated phrase.
      const oldest = Math.min(...list.map(item => recentTemplates.lastIndexOf(item)));
      const alternatives = list.filter(item => recentTemplates.lastIndexOf(item) === oldest);
      const selected = pick(fresh.length ? fresh : alternatives, random);
      recentTemplates.push(selected);
      if (recentTemplates.length > 48) recentTemplates.shift();
      return selected;
    }
    const synonymsList = (_b = options.synonyms) != null ? _b : [];
    const opts = {
      // Keys get the same spelling fixes as the input ("ai" -> "artificial intelligence"), so they always line up.
      knowledge: ((_c = options.knowledge) != null ? _c : []).map((e) => ({
        ...e,
        keys: e.keys.map((k) => applySynonyms(normalize(k), synonymsList)),
        ...e.requires ? { requires: e.requires.map((r) => applySynonyms(normalize(r), synonymsList)) } : {}
      })),
      responses: (_d = options.responses) != null ? _d : [],
      reflections: (_e = options.reflections) != null ? _e : [],
      synonyms: synonymsList,
      greetings: (_f = options.greetings) != null ? _f : ["Hi, I'm {botName}. How can I help you today?"],
      reviveLines: (_g = options.reviveLines) != null ? _g : [],
      fallbacks: (_h = options.fallbacks) != null ? _h : ["I'm not sure I understood. Could you say that another way?"],
      fallbackActions: (_i = options.fallbackActions) != null ? _i : [],
      defaultActions: (_j = options.defaultActions) != null ? _j : [],
      moodLines: { ...DEFAULT_MOOD_LINES, ...options.moodLines },
      moodPrompts: { ...DEFAULT_MOOD_PROMPTS, ...options.moodPrompts },
      acknowledgeMoods: (_k = options.acknowledgeMoods) != null ? _k : ["angry", "distressed", "depressed", "jolly", "happy"],
      supportNudge: (_l = options.supportNudge) != null ? _l : DEFAULT_SUPPORT_NUDGE,
      smallTalkWithKnowledge: (_m = options.smallTalkWithKnowledge) != null ? _m : true,
      crisis: (_n = options.crisis) != null ? _n : { message: DEFAULT_CRISIS_MESSAGE },
      business: (_o = options.business) != null ? _o : null,
      gentle: (_p = options.gentle) != null ? _p : false,
      lizaTemplates: (_q = options.lizaTemplates) != null ? _q : true,
      care: (_r = options.care) != null ? _r : true,
      lizaTopics: (_s = options.lizaTopics) != null ? _s : null,
      bridge: (_t = options.bridge) != null ? _t : null
    };
    const lizaResponses = opts.lizaTopics ? opts.responses.filter((r) => {
      var _a2;
      return (_a2 = opts.lizaTopics) == null ? void 0 : _a2.includes(r.id);
    }) : opts.responses;
    const contextTerms = [...new Set(opts.knowledge.flatMap((e) => {
      var _a2;
      return (_a2 = e.requires) != null ? _a2 : [];
    }))];
    const CONTEXT_TURNS = 3;
    const activeContext = () => new Set([...state.context].filter(([, turn]) => state.turn - turn <= CONTEXT_TURNS).map(([term]) => term));
    const clock = {
      now: (_u = options.now) != null ? _u : () => /* @__PURE__ */ new Date(),
      userTimeZone: (_v = options.userTimeZone) != null ? _v : detectTimeZone(),
      hub: options.hub
    };
    const state = {
      botName: (_x = (_w = options.name) != null ? _w : pick(options.names, random)) != null ? _x : "Liza",
      /** @type {string | undefined} */
      userName: void 0,
      /** Messages the user sent, newest last (used by revive lines). */
      topics: (
        /** @type {string[]} */
        []
      ),
      /** @type {Mood[]} */
      moods: [],
      misses: 0,
      /** What the visitor told us about their business. */
      profile: (
        /** @type {any} */
        { pains: [], needs: [], buying: false }
      ),
      /** Advice keys already given, so personalised lines aren't repeated. */
      advice: /* @__PURE__ */ new Set(),
      lateNightNoted: false,
      turn: 0,
      /** Bridge lines already used, so they don't repeat. */
      bridges: /* @__PURE__ */ new Set(),
      /** Moods we've already offered a self-care tip for. */
      tips: /* @__PURE__ */ new Set(),
      /** Something hard the visitor shared, to check in on later: { topic, turn }. */
      concern: (
        /** @type {{ topic: string, turn: number } | null} */
        null
      ),
      /** The last message that was sad, anxious or angry (0 = none recently). */
      lastLowTurn: 0,
      /** Subjects mentioned recently ("quantum pod"), with the turn they were last mentioned. */
      context: /* @__PURE__ */ new Map()
    };
    // Small, local memory: no server or API is required. Clear chat clears memory too.
    const memoryKey = options.memoryKey || "beyondai.via.memory.v1";
    const memoryEnabled = options.memory !== false;
    const memoryTTL = 7 * 24 * 60 * 60 * 1000;
    const recent = [];
    let wordingSnapshot, wordingCache = "";
    rememberedWording = () => {
      const latest = recent[recent.length - 1];
      if (latest !== wordingSnapshot) {
        wordingSnapshot = latest;
        wordingCache = normalize(recent.slice(-5).map(exchange => exchange.assistant).join(" "));
      }
      return wordingCache;
    };
    const remembered = [];
    const concerns = [];
    let activeConcern = null;
    let focusConcern = null;
    let resolvedConcern = null;
    const listening = { noAdvice: false, noQuestions: false };
    const alignment = { stage: 0, lastTurn: -3, service: "" };
    let lastSubjects = [];
    function saveMemory() {
      if (!memoryEnabled) return;
      try {
        localStorage.setItem(memoryKey, JSON.stringify({ version: 1, savedAt: Date.now(),
          userName: state.userName, recent, remembered, lastSubjects,
          profile: state.profile, turn: state.turn, context: [...state.context],
          concerns, activeConcern, listening, alignment }));
      } catch (_) { /* Private browsing/storage limits: retain memory for this visit. */ }
    }
    function restoreMemory() {
      if (!memoryEnabled) return;
      try {
        const m = JSON.parse(localStorage.getItem(memoryKey) || "null");
        if (!m) return;
        if (m.version !== 1 || !Number.isFinite(m.savedAt) || Date.now() - m.savedAt > memoryTTL) {
          localStorage.removeItem(memoryKey); return;
        }
        const short = (v, max) => typeof v === "string" && v.length <= max;
        if (short(m.userName, 100)) state.userName = m.userName;
        if (Array.isArray(m.recent)) recent.push(...m.recent.filter(t => t && short(t.user, 8000) && short(t.assistant, 30000)).slice(-30));
        if (Array.isArray(m.remembered)) remembered.push(...m.remembered.filter(t => short(t, 500)).slice(-20));
        if (Array.isArray(m.lastSubjects)) lastSubjects = m.lastSubjects.filter(id => opts.knowledge.some(e => e.id === id)).slice(0, 3);
        if (Number.isSafeInteger(m.turn) && m.turn >= 0) state.turn = m.turn;
        if (Array.isArray(m.concerns)) concerns.push(...m.concerns.filter(c =>
          c && short(c.key, 80) && short(c.summary, 400) && ["open", "resolved"].includes(c.status)
          && Number.isSafeInteger(c.turn) && c.turn >= 0 && c.turn <= state.turn
          && ["", "work", "learning", "security", "software", "business"].includes(c.service)
          && !/\b(?:astrix|nova|physics|veta|virtual experience)\b/i.test(c.summary)).slice(-8));
        activeConcern = concerns.some(c => c.key === m.activeConcern && c.status === "open") ? m.activeConcern : null;
        if (m.listening && typeof m.listening === "object") {
          listening.noAdvice = m.listening.noAdvice === true;
          listening.noQuestions = m.listening.noQuestions === true;
        }
        if (m.alignment && typeof m.alignment === "object") {
          if (Number.isInteger(m.alignment.stage) && m.alignment.stage >= 0 && m.alignment.stage <= 3) alignment.stage = m.alignment.stage;
          if (Number.isInteger(m.alignment.lastTurn) && m.alignment.lastTurn <= state.turn) alignment.lastTurn = m.alignment.lastTurn;
          if (["", "work", "learning", "security", "software", "business"].includes(m.alignment.service)) alignment.service = m.alignment.service;
        }
        if (Array.isArray(m.context)) state.context = new Map(m.context.filter(t => Array.isArray(t) && contextTerms.includes(t[0]) && Number.isSafeInteger(t[1]) && t[1] <= state.turn));
        if (m.profile && typeof m.profile === "object") {
          for (const key of ["business", "size", "wantedTeam", "timeline", "location"]) if (short(m.profile[key], 300) || typeof m.profile[key] === "number") state.profile[key] = m.profile[key];
          for (const key of ["pains", "needs"]) if (Array.isArray(m.profile[key])) state.profile[key] = m.profile[key].filter(t => short(t, 300)).slice(-20);
          state.profile.buying = m.profile.buying === true;
        }
        state.topics = recent.map(t => t.user).slice(-30);
        // Upgrade existing browser memory using only the user's own saved messages.
        if (!Array.isArray(m.concerns)) {
          for (const exchange of recent) if (!exchange.engine) trackConcerns(exchange.user, detectMood(exchange.user));
          focusConcern = resolvedConcern = null;
        }
      } catch (_) { /* Invalid or unavailable storage must never stop the chatbot. */ }
    }
    restoreMemory();
    function concernDomain(text) {
      const domains = [
        ["security", /\b(?:hacked|password|scam|virus|cybersecurity|cyber security|data breach|security)\b/, "security"],
        ["learning", /\b(?:learn|learning|study|studying|exam|school|course|skill|education)\b/, "learning"],
        ["workload", /\b(?:paperwork|spreadsheet|repetitive|manual tasks|automate|automation|overtime|workload|deadline|work|boss|job)\b/, "work"],
        ["software", /\b(?:app|website|software|system|program)\b/, "software"],
        ["business", /\b(?:business|customers|clients|sales|shop|store|company|staff|employees)\b/, "business"],
        ["relationships", /\b(?:friend|partner|wife|husband|mother|father|family|lonely|ignored|relationship)\b/, ""]
      ];
      return domains.find(([, pattern]) => pattern.test(text)) || ["personal", null, ""];
    }
    function trackConcerns(raw, mood) {
      focusConcern = null;
      resolvedConcern = null;
      const text = normalize(raw);
      if (mood.crisis || /\b(?:astrix|nova|physics|veta|virtual experience)\b/.test(text)) return;
      if (/\b(?:just listen|no advice|not looking for advice|do not (?:give|offer) advice)\b/.test(text)) listening.noAdvice = true;
      if (/\b(?:no (?:more )?questions|do not ask|stop asking)\b/.test(text)) listening.noQuestions = true;
      if (/\b(?:give me advice|advice please|suggest something|what should i do|what can help)\b/.test(text)) listening.noAdvice = false;
      if (/\b(?:you can ask|ask me questions|questions are okay)\b/.test(text)) listening.noQuestions = false;
      if (/\b(?:change (?:the )?(?:subject|topic)|something else|new topic|move on)\b/.test(text)) { activeConcern = null; return; }
      const [domain] = concernDomain(text);
      const open = concerns.filter(c => c.status === "open");
      const previous = open.find(c => c.key === activeConcern);
      const refersBack = /\b(?:that|this|it|same|still|again|earlier|before|remember|concern|problem|more|next|options)\b/.test(text) && text.split(" ").length <= 22;
      focusConcern = open.find(c => domain !== "personal" && c.key === domain) || (refersBack ? previous : null);
      if (/\b(?:resolved|fixed|sorted out|no longer (?:need|worried)|not worried anymore|problem is solved|issue is solved)\b/.test(text) && (focusConcern || previous)) {
        const done = focusConcern || previous; done.status = "resolved"; done.turn = state.turn;
        resolvedConcern = done.summary;
        activeConcern = null; focusConcern = null;
        if (splitSentences(raw).flatMap(splitConversationParts).length === 1) return;
      }
      for (const sentence of splitSentences(raw)) {
        const t = normalize(sentence);
        if (!/\b(?:i|my|we|our)\b/.test(t) || isQuestion(sentence)) continue;
        if (!/\b(?:need|want|hope|struggl\w*|worr\w*|concern\w*|problem|cannot|can not|overwhelm\w*|stress\w*|depressed|lonely|sad|angry|anxious|hurt|afraid|fear|exhausted)\b/.test(t)) continue;
        if (/\b(?:no advice|no questions|just listen)\b/.test(t) && t.split(" ").length < 9) continue;
        let [key, , service] = concernDomain(t);
        if (key === "personal" && domain !== "personal") [key, , service] = concernDomain(text);
        const summary = (key !== "personal" && concernDomain(t)[0] === "personal" ? raw : sentence).trim().slice(0, 400);
        const entry = concerns.find(c => c.key === key);
        // Keep the concrete concern when a short continuation adds no new detail.
        if (refersBack && t.split(" ").length <= 8 && previous) { focusConcern = previous; continue; }
        if (entry) Object.assign(entry, {summary, service, status: "open", turn: state.turn});
        else {
          concerns.push({key, summary, service, status: "open", turn: state.turn});
          if (concerns.length > 8) concerns.shift();
        }
        activeConcern = key;
      }
      if (focusConcern) activeConcern = focusConcern.key;
    }
    function memoryAnswer(raw) {
      const text = normalize(raw);
      if (/^(?:please )?(?:forget (?:everything|all|me|my (?:name|details)|our (?:chat|conversation|conversations))|clear (?:your |my |our )?(?:memory|history|conversation))$/.test(text)) {
        reset(); return {text: "I've cleared your name and our saved conversation memory.", source: "memory"};
      }
      if (/^(?:please )?(?:forget|clear) my (?:needs|concerns|goals|problems)$/.test(text)) {
        const summaries = concerns.map(c => normalize(c.summary));
        const matchesConcern = value => summaries.some(summary => summary && normalize(value).includes(summary));
        for (let i = recent.length - 1; i >= 0; i--) if (matchesConcern(recent[i].user)) recent.splice(i, 1);
        for (let i = remembered.length - 1; i >= 0; i--) if (matchesConcern(remembered[i])) remembered.splice(i, 1);
        state.topics = state.topics.filter(t => !matchesConcern(t));
        state.profile.pains = []; state.profile.needs = [];
        concerns.length = 0; activeConcern = focusConcern = resolvedConcern = null;
        saveMemory();
        return {text: "I've cleared the needs and concerns you shared.", source: "memory"};
      }
      const relation = text.match(/\b(?:what is|what s|do you remember|do you know) my (friend|wife|husband|son|daughter|mother|father|brother|sister|partner|colleague|boss)(?: s)? name\b/);
      if (relation) {
        const fact = [...remembered].reverse().find(t => normalize(t).startsWith(`my ${relation[1]} name is `));
        return {text: fact || `You haven't told me your ${relation[1]}'s name yet.`, source: "memory"};
      }
      if (/\b(?:what is my name|what s my name|do you (?:remember|know) my name|who am i)\b/.test(text)) {
        return { text: state.userName ? `Your name is ${state.userName}.` : "You haven't told me your name yet. What would you like me to call you?", source: "memory" };
      }
      if (/\b(?:what (?:are|were|is|was) my (?:main )?(?:needs?|concerns?|goals?|problems?)|remember (?:my|what i (?:need|am worried about))|what (?:am i|was i) (?:worried|concerned) about)\b/.test(text)) {
        const open = concerns.filter(c => c.status === "open");
        return {text: open.length ? "The needs and concerns you've shared are:\n" + open.map(c => "- " + c.summary).join("\n") : "I don't have an open concern saved yet. Tell me what matters most to you.", source: "memory"};
      }
      if (/^(?:what did i (?:just )?(?:say|ask)|repeat my last (?:message|question))$/.test(text)) {
        return {text: recent.length ? `You said: “${recent[recent.length - 1].user}”` : "I don't have an earlier message from you in this chat yet.", source: "memory"};
      }
      if (/\b(?:what (?:were we|did we|have we) (?:talk|talking|discuss|discussing)|remember (?:our|the) (?:recent |last |previous )?(?:conversation|chat)|what (?:do you remember|have i told you)|summarize (?:our|the) (?:chat|conversation))\b/.test(text)) {
        // An unrelated recall request must not promote hidden engine knowledge.
        const visible = recent.filter(t => !t.engine).slice(-4);
        const parts = [state.userName ? `Your name is ${state.userName}.` : "", ...remembered, ...concerns.filter(c => c.status === "open").map(c => "A concern you shared: “" + c.summary + "”")];
        if (visible.length) parts.push("Recently, you told me or asked:\n" + visible.map(t => `- ${t.user}`).join("\n"));
        return {text: parts.filter(Boolean).join("\n\n") || "We haven't built up any conversation history yet.", source: "memory"};
      }
      return null;
    }
    const names = () => ({ botName: state.botName, userName: state.userName });
    const values = () => ({ ...timeValues(clock), botName: state.botName, userName: state.userName || "" });
    const say = (template, extra = {}) => tidy(fill(template, { ...values(), ...extra }));
    const fillAnswer = (text) => fill(text, values());
    const answerOf = (entry) => {
      var _a2;
      return fillAnswer((_a2 = entry.answers ? pick(entry.answers, random) : entry.answer) != null ? _a2 : "");
    };
    function greet() {
      var _a2;
      return { text: say((_a2 = pick(opts.greetings, random)) != null ? _a2 : ""), source: "greeting" };
    }
    function revive() {
      var _a2, _b2;
      if (!opts.reviveLines.length || state.topics.length === 0) return null;
      const topic = reflect(normalize((_a2 = pick(state.topics, random)) != null ? _a2 : ""), opts.reflections);
      return (
        /** @type {BotReply} */
        { text: say((_b2 = pick(opts.reviveLines, random)) != null ? _b2 : "", { topic }), source: "revive" }
      );
    }
    function reset() {
      recentTemplates.length = 0;
      recent.length = 0;
      remembered.length = 0;
      concerns.length = 0;
      activeConcern = focusConcern = resolvedConcern = null;
      listening.noAdvice = listening.noQuestions = false;
      Object.assign(alignment, {stage: 0, lastTurn: -3, service: ""});
      lastSubjects = [];
      try { if (memoryEnabled) localStorage.removeItem(memoryKey); } catch (_) {}
      state.userName = void 0;
      state.topics = [];
      state.moods = [];
      state.misses = 0;
      state.profile = { pains: [], needs: [], buying: false };
      state.advice = /* @__PURE__ */ new Set();
      state.lateNightNoted = false;
      state.turn = 0;
      state.bridges = /* @__PURE__ */ new Set();
      state.tips = /* @__PURE__ */ new Set();
      state.concern = null;
      state.lastLowTurn = 0;
      state.context = /* @__PURE__ */ new Map();
    }
    function reply(message) {
      const raw = String(message).trim().slice(0, 8000);
      const mood = detectMood(raw);
      // Safety handling always precedes ordinary recall and conversation routing.
      const recall = mood.crisis || splitSentences(raw).length > 1 ? null : memoryAnswer(raw);
      if (recall) return { ...withBridge(recall, raw, mood), mood };
      state.moods.push(mood.mood);
      state.moods = state.moods.slice(-30);
      if (raw) state.topics.push(raw);
      state.topics = state.topics.slice(-30);
      state.turn += 1;
      trackConcerns(raw, mood);
      const answer = answerFor(raw, mood);
      if (answer.source === "fallback") state.misses += 1;
      else state.misses = 0;
      const result = { ...connectReply(withBrandClosing(withBridge(withCare(answer, raw, mood), raw, mood), raw, mood)), mood };
      if (raw && !mood.crisis) {
        const ids = (answer.topic || "").split(",").filter(id => opts.knowledge.some(e => e.id === id));
        if (ids.length) lastSubjects = ids.slice(0, 3);
        const engine = ids.some(id => opts.knowledge.some(e => e.id === id && e.engine)) || /\b(astrix|nova|physics|virtual experience)\b/i.test(raw);
        recent.push({user: raw, assistant: result.text, engine});
        if (recent.length > 30) recent.shift();
        if (!engine) for (const sentence of splitSentences(raw)) {
          const person = sentence.match(/\bmy (friend|wife|husband|son|daughter|mother|father|brother|sister|partner|colleague|boss)(?:['’]s)? name is\s+([\p{L}][\p{L}'’-]*(?:[ \t]+[\p{L}][\p{L}'’-]*){0,2})/iu);
          if (person) {
            const value = person[2].split(/\s+(?:and|but|who|is|works)\b/i)[0];
            const key = `My ${person[1].toLowerCase()}'s name is `;
            const old = remembered.findIndex(t => t.startsWith(key));
            if (old >= 0) remembered.splice(old, 1);
            remembered.push(key + value + ".");
            if (remembered.length > 20) remembered.shift();
          }
          const note = sentence.match(/^\s*(?:please\s+)?remember (?:that\s+)?(.{1,500})$/i);
          if (note && !/^(?:me|my name|our|the chat|when|what|how)\b/i.test(note[1])) {
            if (!remembered.includes(note[1])) remembered.push(note[1]);
            if (remembered.length > 20) remembered.shift();
          }
        }
        saveMemory();
      }
      return result;
    }
    function answerFor(raw, mood) {
      var _a2, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2;
      if (mood.crisis) return { text: opts.crisis.message, actions: opts.crisis.actions, source: "crisis" };
      if (resolvedConcern && splitSentences(raw).flatMap(splitConversationParts).length === 1) return {text: "Thanks for the update. I've marked that concern as resolved.", source: "memory"};
      if (focusConcern && splitSentences(raw).length === 1 && normalize(raw).split(" ").length <= 22
        && /^(?:what (?:can help|should i do|would you suggest|next|are my options)|tell me more|how (?:can you help|do i (?:start|proceed)|can i (?:start|handle|deal))|any (?:advice|suggestions))\b/.test(normalize(raw))
        && !/\b(?:astrix|nova|physics|veta|virtual experience|price|pricing|cost)\b/.test(normalize(raw))) {
        const context = {
          work: "Let's look for a practical way to ease that workload.",
          learning: "Let's find a learning option that suits your experience and goals.",
          security: "Let's focus on the protection and support you need.",
          software: "Let's narrow down the features that would be useful to you.",
          business: "Let's focus on the part of your business that needs support."
        }[focusConcern.service] || "We can take this one step at a time.";
        const next = focusConcern.service
          ? "Let's focus on what you need most, so I can point you toward a useful option."
          : "We can work through that together, starting with the part you want help with.";
        const question = listening.noQuestions ? "" : focusConcern.service
          ? alignment.stage >= 2 && alignment.service === focusConcern.service
            ? "Would you like help outlining your requirements for the Beyond AI team?"
            : "Which part of that takes the most time or causes the most difficulty?"
          : "Would you prefer to talk it through, or consider a small next step?";
        return {text: [context, next, question].filter(Boolean).join("\n\n"), source: "empathy", topic: "concern-followup", caring: true, gentlePromotion: !focusConcern.service};
      }
      if (opts.care && state.lastLowTurn > 0 && state.turn - state.lastLowTurn <= 8 && splitSentences(raw).length === 1 && FEELS_BETTER.test(normalize(raw))) {
        state.lastLowTurn = 0;
        state.concern = null;
        const thanked = /\b(thanks|thank you|salamat)\b/.test(normalize(raw));
        const text = [pick(FEELING_BETTER_LINES, random), thanked ? "Thank you for talking with me." : "", "What helped you feel better?"].filter(Boolean).join(" ");
        return { text, source: "empathy", topic: "feeling-better" };
      }
      const sentences = splitSentences(raw).flatMap(splitConversationParts).flatMap(original => planPhrases(original, lizaResponses, names())).map((original) => ({ original, text: applySynonyms(normalize(original), opts.synonyms) })).filter((s) => s.text);
      if (sentences.length === 0) return { text: say((_a2 = pick(opts.fallbacks, random)) != null ? _a2 : "", { phrase: "" }), source: "fallback" };
      let nameLine = resolvedConcern ? "Thanks for the update. I've marked the earlier concern as resolved." : "";
      for (const s of sentences) {
        const recalled = memoryAnswer(s.original);
        if (recalled) {
          nameLine += `${nameLine ? " " : ""}${recalled.text}`;
          s.text = "";
          continue;
        }
        const note = s.original.match(/^\s*(?:please\s+)?remember (?:that\s+)?(.{1,500})$/i);
        if (note && !/^(?:me|my name|our|the chat|when|what|how)\b/i.test(note[1])) {
          nameLine += `${nameLine ? " " : ""}I'll remember: ${note[1]}`;
          s.text = "";
          continue;
        }
        const introduction = readIntroduction(s.original);
        if (introduction) {
          const previous = state.userName;
          state.userName = introduction.name;
          nameLine = previous === introduction.name ? `Yes, ${introduction.name}, I remember your name.` : previous ? `I'll call you ${introduction.name} from now on.` : `Nice to meet you, ${introduction.name}.`;
          // Keep the question or personal statement following the introduction.
          s.original = introduction.rest;
          s.text = applySynonyms(normalize(introduction.rest), opts.synonyms);
        }
      }
      const rest = sentences.filter((s) => s.text);
      const facts = opts.business ? extractBusiness(raw, normalize(raw)) : null;
      if (facts) state.profile = mergeProfile(state.profile, facts);
      const toldUsSomething = Boolean(facts && (facts.business || facts.size || facts.wantedTeam || facts.timeline || facts.location || facts.buying || facts.pains.length));
      if (opts.business && rest.length && rest.every((s) => asksForSummary(s.text))) return summaryReply();
      const timeBlocks = [];
      rest.forEach((s, i) => {
        if (opts.business && asksForSummary(s.text)) {
          const summary = summaryReply();
          timeBlocks.push({at: i, text: summary.text, casual: true, actions: summary.actions});
          return;
        }
        const kind = timeQuestion(s.text);
        if (kind) timeBlocks.push({ at: i, text: timeAnswer(kind, clock, "I") });
        else {
          const casual = casualPartAnswer(s);
          if (casual) timeBlocks.push({at: i, text: casual, casual: true});
        }
      });
      const whole = rest.map((s) => s.text).join(" ");
      for (const term of contextTerms) if (containsPhrase(whole, term)) state.context.set(term, state.turn);
      const hits = collectKnowledge(rest).filter((h) => {
        const at = Math.round(h.at);
        if (timeBlocks.some(t => t.at === at)) return false;
        const part = rest[at];
        const ordinaryConcern = part && !isQuestion(part.original)
          && PERSONAL.test(part.text) && /\b(?:need|want|worried|sad|angry|tired|exhausted|overwhelmed|struggling|budget)\b/.test(part.text)
          && !/\b(?:beyond ai|astrix|nova|physics|veta|hrm|erp|talkora|quantum|e cash|ai education|course)\b/.test(part.text);
        return !ordinaryConcern;
      });
      const specific = hits.filter((h) => !h.entry.smallTalk && !h.entry.overview);
      const topics = hits.filter((h) => !h.entry.smallTalk && !(h.entry.overview && specific.some(other => Math.round(other.at) === Math.round(h.at)))).filter((h, _, all) => {
        var _a3;
        return !((_a3 = h.entry.skipIf) == null ? void 0 : _a3.some((id) => all.some((o) => o.entry.id === id)));
      });
      const byImportance = [...topics].sort((a, b) => Number(b.question) - Number(a.question) || a.at - b.at);
      const shown = byImportance.sort((a, b) => a.at - b.at);
      const more = [];
      const smallTalkHits = hits.filter((h) => h.entry.smallTalk);
      const opener = (_b2 = smallTalkHits.find((h) => h.entry.brief)) == null ? void 0 : _b2.entry.brief;
      const answered = /* @__PURE__ */ new Set([...hits.map((h) => Math.round(h.at)), ...timeBlocks.map((t) => t.at), ...alsoAnswered]);
      const skip = /* @__PURE__ */ new Set([...hits.filter((h) => h.entry.moodOk).map((h) => Math.round(h.at)), ...alsoAnswered]);
      if (opts.business) {
        const ids = shown.map((h) => h.entry.id).filter((id) => {
          var _a3, _b3;
          return (_b3 = (_a3 = opts.business) == null ? void 0 : _a3.serviceIds) == null ? void 0 : _b3.includes(id);
        });
        state.profile.needs = [.../* @__PURE__ */ new Set([...state.profile.needs, ...ids])];
      }
      const remaining = rest.map((part, i) => ({...part, i})).filter(part => !answered.has(part.i));
      const personalParts = rest.map((part, i) => ({...part, i})).filter(part => !timeBlocks.some(block => block.casual && block.at === part.i) && !isQuestion(part.original) && (!answered.has(part.i) || PERSONAL.test(part.text) && /\b(?:need|want|worried|worry|afraid|sad|angry|happy|tired|exhausted|stressed|overwhelmed|cannot|can not|struggling|budget)\b/.test(part.text)));
      const caringReply = assembleCaring(personalParts, "", detectMood(personalParts.map(p => p.original).join(" ")), true);
      const otherParts = caringReply ? remaining.filter(part => isQuestion(part.original)) : remaining;
      const otherHeard = listen(otherParts, { reflections: opts.reflections, responses: lizaResponses, names: names(), chooseFresh, gentle: opts.gentle, lizaTemplates: opts.lizaTemplates, random });
      const heard = caringReply ? {
        text: [caringReply.text, otherHeard && otherHeard.text, otherHeard && otherHeard.closing].filter(Boolean).join("\n\n"),
        pieces: [{i: personalParts[0].i, text: caringReply.text}, ...(otherHeard ? otherHeard.pieces.map(p => ({...p, i: otherParts[p.i] ? otherParts[p.i].i : p.i})) : [])],
        closing: "", kinds: ["feeling", ...(otherHeard ? otherHeard.kinds : [])]
      } : otherHeard;
      const meaningful = Boolean(heard);
      const businessTalk = toldUsSomething || shown.some((h) => !h.entry.casual);
      const advice = businessTalk && !caringReply && !listening.noAdvice ? adviceFor(shown.map((h) => h.entry.id)) : null;
      const lateNight = lateNightLine(mood);
      if (shown.length || timeBlocks.length) {
        const blocks = [...shown.map((h) => ({ at: h.at, text: answerOf(h.entry) })), ...timeBlocks].sort((a, b) => a.at - b.at);
        const items = [
          ...blocks.map((b) => ({ at: b.at, text: b.text, chat: false })),
          ...meaningful ? heard.pieces.map((p) => ({ at: p.i, text: p.text, chat: true })) : []
        ].sort((a, b) => a.at - b.at);
        const body = [];
        for (const item of items) {
          const last = body[body.length - 1];
          if (item.chat && last && last.chat) last.text += ` ${item.text}`;
          else body.push({ ...item });
        }
        const bodyTexts = body.map((b) => b.text);
        if (more.length) bodyTexts.push(`I can also tell you about ${listOf3(more.map((h) => {
          var _a3;
          return (_a3 = h.entry.title) != null ? _a3 : h.entry.id;
        }))}. Just ask.`);
        if (advice) bodyTexts.push(advice.text);
        const lead = [opener, nameLine].filter(Boolean).join(" ");
        const answersAsk = blocks.some((b) => /\?\s*$/.test(b.text.trim()));
        const caring = meaningful && heard.kinds.some((k) => k === "feeling" || k === "person") && !answersAsk;
        const tail = [caring ? heard.closing : "", lateNight].filter(Boolean).join(" ");
        const moodHandled = meaningful || shown.some((h) => h.entry.moodOk);
        const thanks = (_c2 = smallTalkHits.find((h) => h.entry.closing)) == null ? void 0 : _c2.entry.closing;
        const text = withMood(lead, mood, [...bodyTexts, tail].filter(Boolean).join("\n\n"), { acknowledge: !moodHandled });
        const topicIds = [...shown.map((h) => h.entry.id), ...timeBlocks.map(t => t.casual ? "conversation" : "time"), ...meaningful ? ["listening"] : [], ...advice ? [`advice:${advice.key}`] : []];
        const actions2 = mergeActions(shown, [...(advice && advice.actions || []), ...timeBlocks.flatMap(block => block.actions || [])]);
        const business = Boolean(advice) || shown.some((h) => !h.entry.casual);
        return { text, actions: actions2.length ? actions2 : void 0, source: shown.length ? "knowledge" : timeBlocks.every(t => t.casual) ? "smalltalk" : "time", topic: topicIds.join(","), business, caring: Boolean(caringReply) || timeBlocks.some(t => t.casual), person: heard == null ? void 0 : heard.person, outro: thanks };
      }
      if (meaningful) {
        const thanks = (_d2 = smallTalkHits.find((h) => h.entry.closing)) == null ? void 0 : _d2.entry.closing;
        const text = [opener, nameLine, heard.text, heard.closing, advice == null ? void 0 : advice.text, lateNight].filter(Boolean).join(" ");
        const emotional = heard.kinds.some((k) => k === "feeling" || k === "person");
        const askedUs = heard.kinds.includes("company-question");
        const actions2 = (_e2 = advice == null ? void 0 : advice.actions) != null ? _e2 : askedUs ? opts.fallbackActions : void 0;
        return { text: withMood("", mood, text, { acknowledge: false }), actions: actions2, source: emotional ? "empathy" : "smalltalk", topic: caringReply ? "assembled-conversation" : heard.kinds.join(","), responseSet: caringReply && caringReply.responseSet, caring: Boolean(caringReply), gentlePromotion: caringReply && caringReply.gentlePromotion, business: Boolean(advice) || askedUs, person: heard.person, outro: thanks };
      }
      if (smallTalkHits.length) {
        const h = smallTalkHits[0];
        return { text: withMood(nameLine, mood, answerOf(h.entry)), actions: (_f2 = h.entry.actions) != null ? _f2 : opts.defaultActions, source: "knowledge", topic: h.entry.id };
      }
      if (nameLine && rest.length === 0) {
        return { text: withMood(nameLine, mood, "What would you like to talk about?"), source: "name" };
      }
      if (mood.mood !== "neutral") {
        const prompt = (_g2 = pick(opts.moodPrompts[mood.mood], random)) != null ? _g2 : "";
        return { text: withMood(nameLine, mood, prompt, { always: true }), source: "mood" };
      }
      const longest = rest.reduce((a, b) => b.text.length > a.text.length ? b : a, (_h2 = rest[0]) != null ? _h2 : { text: "" });
      const phrase = reflect(longest.text, opts.reflections);
      const actions = state.misses >= 1 ? opts.fallbackActions : void 0;
      const fallback = say((_i2 = pick(opts.fallbacks, random)) != null ? _i2 : "", { phrase });
      return { text: [nameLine, fallback].filter(Boolean).join(" "), actions, source: "fallback" };
    }
    function casualPartAnswer(part) {
      const text = part.text.replace(/\bu\b/g, "you");
      const comments = [];
      if (/\b(?:movie|film|cinema|watched|watch)\b/.test(text)) {
        const askedWatching = /\b(?:have you|did you|you ever)\b.*\b(?:watch|watched|seen)\b/.test(text);
        comments.push(chooseFresh(askedWatching
          ? ["I haven't watched it myself, but a film's atmosphere and storytelling can make it memorable.", "I don't have a personal viewing experience, but I'm happy to discuss the story and what made it work for you."]
          : ["A film's mood can be a big part of what makes it stay with you after the ending.", "A story can be memorable for its atmosphere as much as its plot."]));
      }
      if (/\b(?:coffee|tea)\b/.test(text)) {
        comments.push(chooseFresh(["I don't drink coffee or tea myself, but I can talk about the flavours, the ritual, or what makes a favourite cup special.", "I don't have a drink preference myself, but enjoying a familiar cup can be a lovely part of a routine."]));
      }
      if (/\b(?:brother|sister|mother|father|family|friend|partner)\b/.test(text) && /\b(?:far away|far from|away|abroad|overseas|miss|missing|distance)\b/.test(text)) {
        comments.push(chooseFresh(listening.noAdvice
          ? ["Distance from someone close can hurt. There's no need to push that sadness aside.", "Missing someone close deserves some space, even when other things in the day are going well."]
          : ["Being apart from someone close can hurt. A regular call or a small shared routine can help keep the connection part of daily life.", "Distance can be hard on close relationships. Finding a way to spend a little time together remotely may make it feel less isolating."]));
      }
      return comments.length ? comments.join(" ") : null;
    }
    function assembleCaring(phrases, lead, mood, includeKnowledgeContext = false) {
      const text = phrases.map(p => p.text).join(" ");
      // Keep product knowledge opt-in and preserve factual answer routes.
      const namedTopic = /\b(?:beyond ai|astrix|nova|physics|veta|virtual experience|quantum pod|q pod|ecash|electronic cash|slot machine|hrm|erp|talkora|count trust|agentic ai|cloud|cybersecurity|cyber security|your (?:services|products|course|company)|ai course|artificial intelligence course|contact|pricing|price|webgpu)\b/.test(text);
      const previous = recent[recent.length - 1];
      const continuation = /^(?:it|that|this|still|same|yes|no)\b/.test(text) && /\b(?:still|again|same|hurts|hard|difficult|lonely|better|worse)\b/.test(text) && text.split(" ").length <= 18;
      const continues = Boolean(continuation && (focusConcern || previous && !previous.engine && detectMood(previous.user).mood !== "neutral"));
      const aboutVia = /\byou\b.*\b(?:me|my|care|listen|understand)\b/.test(text);
      const reportedSpeech = phrases.some(p => /["“”]|\b(?:said|told|asked|wrote)\b/i.test(p.original));
      const personal = continues || aboutVia || phrases.some(p => /\b(?:i|me|my|we|our)\b/.test(p.text));
      const reflective = continues || aboutVia || reportedSpeech || phrases.some(p => conversationalIntent(p.text)) || mood.mood !== "neutral";
      const opinionRequest = p => /\b(?:what do you think|your (?:thoughts|opinion)|what would you suggest|any advice)\b/.test(p.text);
      if (!opts.care || namedTopic && !includeKnowledgeContext || !personal || !reflective || phrases.some(p => isQuestion(p.original) && /\b(?:you|your|beyond)\b/.test(p.text) && !opinionRequest(p))) return null;
      const reflected = value => readable(reflect(value, opts.reflections)).replace(/[.!?]+$/, "");
      const pieces = [];
      const seen = new Set();
      for (const phrase of phrases) {
        if (opinionRequest(phrase) && !/\b(?:i|my|we|our)\b/.test(phrase.text)) continue;
        if (/^(?:just listen|only listen|no advice|no (?:more )?questions|do not ask|stop asking)\b/.test(phrase.text)) continue;
        // Preserve the speaker's wording when a second "you" or quoted speech
        // could refer to someone else. Never turn their story into our own claim.
        const preserveVoice = /\byou\b/.test(phrase.text) || /["“”]|\b(?:said|told|asked|wrote)\b/i.test(phrase.original);
        let content = preserveVoice ? 'you said, “' + phrase.original.trim().slice(0, 260).replace(/[.!?]+$/, "") + '”' : reflected(phrase.text);
        // Reflect a painful self-judgment as a judgment, never as an established fact.
        if (!preserveVoice) content = content.replace(/\byou(?:'re| are) (?:a )?(failure|worthless|useless|never good enough)\b/gi, 'you are judging yourself as "$1"');
        if (!content || seen.has(content)) continue;
        seen.add(content);
        const feeling = detectMood(phrase.original);
        const type = /^i (?:want|need|hope|would like)\b/.test(phrase.text) ? "goal" : feeling.mood !== "neutral" ? "feeling" : "experience";
        pieces.push({type, content, mood: feeling.mood, scores: feeling.scores, original: phrase.text, quoted: preserveVoice});
      }
      if (!pieces.length) return null;
      const effectiveMood = continues && mood.mood === "neutral" ? detectMood(focusConcern ? focusConcern.summary : previous.user).mood : mood.mood;
      const negativeMoods = ["angry", "depressed", "distressed"];
      const negative = negativeMoods.includes(effectiveMood);
      // Score both sides of each phrase: a single sentence can contain mixed emotions.
      const mixed = pieces.some(p => {
        const scores = p.scores;
        return negativeMoods.some(m => scores[m] > 0) && (scores.happy > 0 || scores.jolly > 0);
      }) || pieces.some(p => negativeMoods.includes(p.mood)) && pieces.some(p => ["happy", "jolly"].includes(p.mood));
      const profiles = {
        angry: {
          acknowledgements: ["I hear how frustrating this has been.", "That sounds upsetting, and I'm taking what you said seriously.", "You can tell me what happened without having to soften how you feel."],
          thoughts: ["My thought is that your frustration deserves attention, while what you do next can still be a choice.", "I'd separate what happened from what you want to happen next; that may make this easier to untangle.", "I don't want to jump to conclusions about anyone involved. What you've described matters on its own."],
          care: ["I want to help you express what matters without making the situation harder for you.", "We can slow this down and make room for the hurt underneath the anger, if that fits."],
          questions: ["Would you rather let it out, or think through what to say next?", "What would you most like the other person to understand?"]
        },
        depressed: {
          acknowledgements: ["I'm sorry things feel this heavy.", "Thank you for telling me how things have been.", "You don't have to make this sound easier than it feels."],
          thoughts: ["I don't think you have to solve everything at once; we can stay with what feels manageable today.", "My thought is that struggling right now doesn't erase your worth or the effort you've already made.", "I wouldn't measure your whole life by how this difficult moment feels."],
          care: ["I want to understand before offering suggestions.", "We can take this at your pace. You don't have to force a cheerful answer."],
          questions: ["What would make the next little while feel a bit more manageable?", "Would it help more to talk about what happened, or to have me listen for a while?"]
        },
        distressed: {
          acknowledgements: ["That sounds like a lot to hold at once.", "I hear how unsettled this is making you feel.", "Let's give what you're going through some room."],
          thoughts: ["My thought is that we can separate what needs attention now from what can wait.", "I wouldn't expect you to have every answer while you're feeling overwhelmed.", "It may help to focus on one part of this rather than trying to untangle everything together."],
          care: ["I'm here to help you work through this at a pace that suits you.", "You can tell me which part matters most; I'll follow your lead."],
          questions: ["Which part feels most pressing right now?", "What would feel most helpful from me right now?"]
        },
        happy: {
          acknowledgements: ["I'm glad you shared this with me!", "That's lovely to hear.", "This sounds like a moment worth enjoying."],
          thoughts: ["My thought is that it's worth pausing to appreciate what this means to you.", "I'd give this good moment some space before rushing straight to the next thing.", "You get to decide what makes this meaningful; it doesn't have to look impressive to anyone else."],
          care: ["I'm happy to celebrate this with you.", "I'd love to hear the part that made you smile most."],
          questions: ["What has been the best part for you?", "How would you like to mark the moment?"]
        },
        jolly: {
          acknowledgements: ["There's a lot of energy in what you're sharing!", "I'm glad you're having a good moment!", "That sounds like something to enjoy."],
          thoughts: ["My thought is that little moments of fun can deserve as much attention as the big milestones.", "I'd say there's room to enjoy this without immediately making it productive.", "It sounds worth making a little room for what brings you joy."],
          care: ["I'm happy to share the celebration.", "You can tell me the fun part too; our conversation doesn't have to be all serious."],
          questions: ["What's been making you smile?", "What was the highlight?"]
        },
        neutral: {
          acknowledgements: ["Thank you for sharing that with me.", "Thank you for sharing that with me.", "Let's give that a little thought."],
          thoughts: ["We can start with what would make a useful difference for you.", "A clear first step is often more useful than trying to plan everything at once.", "There may be a few ways to approach this; the right one depends on the result you need."],
          care: ["I want to give you a thoughtful answer, and you can correct me if I've missed something.", "We can explore it together without rushing to a conclusion."],
          questions: ["Which part would you like to explore together?", "What would you most like me to understand?"]
        }
      };
      const profile = mixed ? profiles.neutral : profiles[effectiveMood] || profiles.neutral;
      const focus = pieces.find(p => negativeMoods.includes(p.mood)) || pieces.find(p => p.type === "goal") || pieces[pieces.length - 1];
      const responseSets = [
        {id: "warm", acknowledge: true, question: "support"},
        {id: "practical", acknowledge: false, question: "next"},
        {id: "reflective", acknowledge: false, question: "meaning"},
        {id: "encouraging", acknowledge: true, question: "goal"},
        {id: "conversational", acknowledge: false, question: "open"}
      ];
      const eligibleSets = responseSets.filter(set => !negative || set.id !== "encouraging");
      const responseSetId = chooseFresh(eligibleSets.map(set => "response-set:" + set.id)).replace("response-set:", "");
      const responseSet = eligibleSets.find(set => set.id === responseSetId) || eligibleSets[0];
      // Situation observations are tentative; never invent motives or personal experiences.
      let observations = [];
      if (/\b(?:passed|promoted|promotion|graduated|finished|achieved|won|succeeded)\b/.test(text))
        observations = ["That sounds like a meaningful milestone. I think there's room to acknowledge the effort behind it.", "This sounds like something you've been working toward; I'd give yourself a moment to take it in."];
      else if (/\b(?:died|passed away|grief|grieving|funeral|miss my)\b/.test(text))
        observations = ["Loss can hold many feelings at once. I wouldn't expect you to put it into neat words.", "If you'd like, there's room here to talk about the person or what you miss; we don't have to look for a solution."];
      else if (/\b(?:i (?:am|feel|think i am) (?:a )?(?:failure|worthless|useless|never good enough)|hate myself)\b/.test(text))
        observations = ["I hear how harshly you're judging yourself. I wouldn't treat that judgment as a fact about your worth.", "Something painful has happened, but I don't think that makes you a failure as a person."];
      else if (/\b(?:lonely|alone|left out|ignored|no one listens)\b/.test(text))
        observations = ["Wanting to be heard and included is understandable. I wouldn't take this moment as proof that you don't matter.", "Feeling disconnected can be painful. I want to understand the kind of connection you're missing."];
      else if (/\b(?:boss|partner|friend|wife|husband|mother|father|colleague)\b/.test(text) && negative)
        observations = ["It sounds like this relationship matters to you. I can take your hurt seriously without assuming what the other person intended.", "My thought is that what you need from this person may matter as much as the disagreement itself."];
      if (aboutVia && /\b(?:not|never|do not|cannot|can not)\b/.test(text))
        observations = ["If my last reply missed what you meant, I'd like to understand it better and respond more carefully.", "You deserve a reply that addresses what you actually said. Let me slow down and pay attention to that."];
      else if (aboutVia && !negative)
        observations = ["I'm glad this conversation feels helpful. I'll keep paying attention to what you share.", "Thank you for telling me. I'd like to keep this conversation useful and comfortable for you."];
      let thought = chooseFresh(observations.length ? observations : profile.thoughts);
      thought = thought.replace(/^My (?:first )?thought is (?:that |to )?/, "I think ").replace(/^I think understand/, "I'd like to understand");
      if (mixed) thought = chooseFresh(["I don't think you have to choose one feeling here; the good part and the difficult part can both matter.", "It sounds like more than one feeling is present. Enjoying something doesn't mean the painful part has disappeared."]);
      let questions = focus.type === "goal" && !negative ? ["What would help you take the next step?", "What result would be most useful to you?"] : profile.questions;
      if (mixed) questions = ["Which feeling would you like to give more attention to right now?", "Would you like to talk about the good part, the difficult part, or both?"];
      const justListen = listening.noAdvice || /\b(?:just listen|only listen|do not (?:give|offer) advice|no advice|not looking for advice)\b/.test(text);
      const noQuestions = justListen || listening.noQuestions || /\b(?:no (?:more )?questions|do not ask|stop asking)\b/.test(text);
      const continuity = continues ? chooseFresh(["We don't have to rush this.", "We can keep working through this at your pace."]) : "";
      const contributions = [];
      const covered = new Set();
      const themes = [
        ["workload", /\b(?:work|boss|job|paperwork|repetitive|overtime|deadline|workload)\b/, ["A useful starting point for work is separating the tasks that need your judgment from routine steps that could be simplified.", "For the workload, we can look for small changes that free up time without adding more to your plate."]],
        ["energy", /\b(?:tired|exhausted|burnt out|burned out|overwhelmed|stressed)\b/, ["Your energy matters too. A workable next step should ease the pressure rather than add another demand.", "There is room to protect your energy while we look for a practical way forward."]],
        ["budget", /\b(?:budget|cost|costs|expensive|afford|money|financial|price)\b/, ["Affordability should guide the options. We can start with what you need most and keep the budget in view.", "We can keep the financial side practical by identifying essentials before considering extras."]],
        ["learning", /\b(?:learn|learning|course|study|studying|skill|education|coding)\b/, ["For learning, a small practical exercise can make the next step clearer; your starting level and available time should shape the pace.", "A learning path should fit your current experience, with room to practise rather than pressure to know everything already."]],
        ["time", /\b(?:no time|little time|busy|hours|schedule|family responsibilities|children|kids)\b/, ["The time you have available matters. We can look for an approach that fits around your existing responsibilities.", "A realistic plan needs to leave room for your responsibilities, rather than assume unlimited time."]],
        ["relationship", /\b(?:friend|partner|wife|husband|mother|father|family|lonely|ignored|left out)\b/, ["The personal side deserves attention too. What support you need from people around you can be part of finding a way forward.", "Relationships can carry a lot of weight. We can take your feelings seriously without assuming what anyone else intended."]],
        ["milestone", /\b(?:passed|promoted|promotion|graduated|achieved|won|succeeded)\b/, ["That achievement deserves a moment of appreciation, including the effort it took to get there.", "There is room to enjoy the achievement before deciding what comes next."]],
        ["software", /\b(?:app|website|software|system)\b/, ["For the technical side, we can start with the task it needs to solve and the people who will use it, before narrowing down features.", "The most useful technical option should fit the actual task, so we can begin with the essential features."]],
        ["security", /\b(?:hacked|scam|security|password|data breach|virus)\b/, ["For security, it helps to identify what is affected and what needs protecting before choosing support.", "We can keep the security question concrete by identifying the affected systems and the protection you need."]]
      ];
      for (const part of pieces) {
        let matched = false;
        for (const [key, pattern, lines] of themes) if (pattern.test(part.original)) {
          matched = true;
          if (!covered.has(key)) { contributions.push(chooseFresh(lines)); covered.add(key); }
        }
        if (!matched && pieces.length > 1 && part.mood !== "neutral" && !covered.has(part.mood)) {
          const partProfile = profiles[part.mood] || profile;
          contributions.push(chooseFresh(partProfile.thoughts).replace(/^My (?:first )?thought is that /, "I think "));
          covered.add(part.mood);
        }
      }
      const support = justListen ? "Take your time. You can share as much or as little as you want, without pressure to find a solution." : chooseFresh(profile.care);
      // Respond to the subject directly. Neutral goals don't need a ritual
      // thank-you, a generic thought, and a generic question on every turn.
      const acknowledgement = responseSet.acknowledge && effectiveMood !== "neutral" && (!previous || detectMood(previous.user).mood !== effectiveMood)
        ? chooseFresh(profile.acknowledgements) : "";
      const questionChoices = [
        ["workload", ["Which task takes the most time?", "Where does the work tend to get held up?", "Is the bigger difficulty the amount of work or the way it is organized?"]],
        ["learning", ["What would you like to be able to do with AI?", "Would a guided exercise or a small project suit you better?", "How much time could you comfortably set aside to practise?"]],
        ["budget", ["Have you set a budget range yet?", "Which part is essential to keep within budget?", "Would it help to separate the essentials from the extras?"]],
        ["software", ["Who would use it, and what is the main task it needs to solve?", "Which feature would make the biggest difference first?", "Are you starting with an existing system or a new idea?"]],
        ["security", ["Is there an immediate issue, or are you planning better protection?", "What needs protecting most urgently?", "Which systems are involved?"]],
        ["relationship", ["Would you like to talk about what happened, or what you need from them now?", "What kind of support would feel helpful from someone close to you?"]],
        ["time", ["What would fit realistically around your schedule?", "Would a smaller first step make this easier to fit in?"]]
      ];
      const contextualQuestion = questionChoices.find(([theme]) => covered.has(theme));
      if (contextualQuestion) questions = contextualQuestion[1];
      else if (effectiveMood === "neutral" && focus.type === "goal") questions = [
        "What would you most like to change?",
        "Is this about work, learning, or something personal?",
        "What is getting in the way at the moment?",
        "What would a good outcome look like for you?"
      ];
      if (!contextualQuestion && !negative && focus.type === "goal") {
        const goalQuestions = {
          support: ["What would make it easier to begin?", "Which part would you like a hand with?", "What kind of support would be useful right now?"],
          next: ["What is the first thing you want to tackle?", "What have you tried so far?", "Which part would you start with if it were a little easier?"],
          meaning: ["What would progress look like in everyday terms?", "Which part of this matters most in your day?", "What would you notice first if things improved?"],
          goal: ["What would you like to be able to do next?", "Would a small first step feel manageable?", "What would make this feel worth pursuing?"],
          open: ["Where would you like to start?", "What is the main thing getting in the way?", "Is there a particular task or situation you have in mind?"]
        };
        questions = goalQuestions[responseSet.question];
      }
      const alreadyAsked = previous && previous.assistant.includes("?");
      const needsDetail = effectiveMood === "neutral" && !contributions.length && focus.type === "goal";
      const askNow = !noQuestions && (needsDetail || !alreadyAsked || /\b(?:help|advice|suggest|how|what should)\b/.test(text));
      // One observation and one invitation are enough; avoid stacking five
      // generic "I..." paragraphs before returning the conversation to the user.
      const comments = justListen ? [support] : contributions.length ? contributions : needsDetail ? [] : [thought];
      if (mixed && !justListen && contributions.length) comments.unshift(thought);
      const body = [lead, [acknowledgement, continuity].filter(Boolean).join(" "), ...comments, askNow ? chooseFresh(questions) : ""].filter(Boolean).join("\n\n");
      return {text: body, source: "empathy", topic: "assembled-conversation", responseSet: responseSet.id, caring: true, gentlePromotion: negative || mixed || justListen};
    }

    let alsoAnswered = /* @__PURE__ */ new Set();
    function collectKnowledge(sentences) {
      alsoAnswered = /* @__PURE__ */ new Set();
      const hits = [];
      // Engine knowledge is opt-in per message. Prior context alone cannot expose it.
      const requestedEngine = /\b(?:astrix|nova|physics|webgpu|racetrack|race track|endurance run track|lifeforms?|dunes|normadic|furnariscafatigt|skid marks|vehicle rigging|aircraft autorig|procedural locomotion|terrain streaming|givelife|addvehicle|addaircraft|astrix physics|3d engine|game engine|virtual experiences?(?! technology authority)|interactive experience engine|virtual training engine|simulation engine|learning simulation)\b/.test(sentences.map((s) => s.text).join(" "));
      const availableKnowledge = requestedEngine ? opts.knowledge : opts.knowledge.filter((entry) => !entry.engine);
      const add = (match, at, question = false) => {
        if (!match) return;
        if (hits.some((h) => h.entry.id === match.entry.id)) alsoAnswered.add(Math.round(at));
        else hits.push({ ...match, at, question });
      };
      sentences.forEach((s, i) => {
        let ranked = rankKnowledge(s.text, availableKnowledge, activeContext());
        if (ranked.some((m) => !m.entry.casual)) ranked = ranked.filter((m) => !m.entry.casual);
        else ranked = ranked.slice(0, 1);
        if (detectMood(s.original).mood !== "neutral") ranked = ranked.filter((m) => !m.entry.casual || m.entry.moodOk);
        // Resolve short follow-ups against the last answered subject. Engine
        // entries still require an explicit engine topic in the CURRENT message.
        if (!ranked.length && /^(?:and |also |but )?(?:tell me more|more about|what about|how (?:much|does|do|can)|(?:what|where|when|why) (?:is|are|does|do)|does it|do they|can it|can they|is it|are they|its (?:cost|price)|pricing|cost)/.test(s.text) && /\b(it|that|this|they|them|those|more|cost|price|pricing)\b/.test(s.text) && s.text.split(" ").length <= 18) {
          const subjects = lastSubjects.map(id => availableKnowledge.find(e => e.id === id)).filter(e => e && !e.casual);
          if (subjects.length === 1) {
            const subject = subjects[0];
            ranked = rankKnowledge(`${normalize(subject.title || subject.keys[0])} ${s.text}`, availableKnowledge, activeContext()).filter(m => !m.entry.casual);
          }
        }
        const top = ranked[0];
        if (!top) return;
        const question = isQuestion(s.original);
        ranked.filter((m) => m === top || m.score >= top.score * 0.6).forEach((m) => add(m, i + m.score / -100, question));
      });
      sentences.forEach((s, i) => {
        if (i === 0 || hits.some((h) => Math.round(h.at) === i) || !/\b(it|that|this|they|them|those)\b/.test(s.text)) return;
        const combined = rankKnowledge(`${sentences[i - 1].text} ${s.text}`, availableKnowledge, activeContext()).filter((m) => !m.entry.casual);
        const fresh = combined.find((m) => !hits.some((h) => h.entry.id === m.entry.id));
        if (fresh) add(fresh, i - 1e-3, isQuestion(s.original));
        else if (combined.length) alsoAnswered.add(i);
      });
      return hits.sort((a, b) => a.at - b.at);
    }
    function mergeActions(hits, first = []) {
      const out = [];
      for (const a of [...first, ...hits.flatMap((h) => {
        var _a2;
        return (_a2 = h.entry.actions) != null ? _a2 : opts.defaultActions;
      })]) {
        if (!out.some((o) => o.label === a.label)) out.push(a);
      }
      return out.slice(0, MAX_ACTIONS);
    }
    function adviceFor(shownIds) {
      var _a2;
      if (!((_a2 = opts.business) == null ? void 0 : _a2.advise)) return null;
      const advice = opts.business.advise(state.profile, { shownIds, given: state.advice });
      if (!advice || state.advice.has(advice.key)) return null;
      state.advice.add(advice.key);
      return advice;
    }
    function withBridge(answer, raw, mood) {
      var _a2, _b2;
      answer = withRelevantActions(answer, raw);
      if (!opts.bridge || answer.source === "crisis") return answer;
      // An answer already explaining Beyond AI needs no second promotion.
      if (/\bbeyond ai\b/i.test(answer.text)) {
        if (answer.topic === "concern-followup" && /requirements.*Beyond AI team/i.test(answer.text)) {
          alignment.stage = 3;
          alignment.lastTurn = state.turn;
        }
        if (answer.business || answer.source === "knowledge") {
          alignment.stage = Math.max(alignment.stage, 2);
          alignment.lastTurn = state.turn;
        }
        return answer;
      }
      const bridge = opts.bridge({
        text: normalize(raw),
        concern: focusConcern || concerns.find(c => c.key === activeConcern && c.status === "open" && c.turn === state.turn),
        alignment,
        listening,
        source: answer.source,
        mood: answer.gentlePromotion ? "distressed" : mood.mood,
        profile: state.profile,
        turn: state.turn,
        used: state.bridges,
        random
      });
      if (!bridge) return answer;
      alignment.stage = bridge.stage || Math.min(3, alignment.stage + 1);
      alignment.lastTurn = state.turn;
      if (bridge.service) alignment.service = bridge.service;
      state.bridges.add(bridge.text);
      const actions = [...(_a2 = bridge.actions) != null ? _a2 : [], ...(_b2 = answer.actions) != null ? _b2 : []].filter((a, i, all) => all.findIndex((b) => b.label === a.label) === i);
      const bridgeText = fillAnswer(bridge.text);
      if (answer.source !== "knowledge" && answer.source !== "time") {
        // In ordinary conversation, keep the user's response together and place
        // the commercial connection at the end, after every concern is addressed.
        return withRelevantActions({...answer, closingConnection: bridgeText, actions}, raw);
      }
      const closing = answer.text.match(/(?:^|\n\n)([^\n]*\?)\s*$/);
      const main = closing ? answer.text.slice(0, closing.index).trim() : answer.text;
      return withRelevantActions({ ...answer, text: [main, bridgeText, closing ? closing[1] : ""].filter(Boolean).join("\n\n"), actions }, raw);
    }
    function connectReply(answer) {
      if (answer.source === "crisis" || answer.source === "memory") return answer;
      // Keep all response components and action buttons. Join prose into a
      // conversation while retaining the structure of lists and code examples.
      const blocks = answer.text.trim().split(/\n\s*\n/);
      const output = [];
      let prose = [];
      let inCode = false;
      const flush = () => { if (prose.length) output.push(prose.join(" ")); prose = []; };
      for (const block of blocks) {
        const fences = (block.match(/^\s*```/gm) || []).length;
        const structured = inCode || fences > 0 || /^(?:\s*(?:[-*+] |\d+[.)] |#{1,6} |>|\|)| {4}\S)/m.test(block);
        if (structured) {
          flush(); output.push(block);
        } else {
          let text = block.replace(/\s*\n\s*/g, " ").trim();
          if (prose.length) {
            if (/^I don't (?:drink|have a drink preference)/.test(text)) {
              text = "As for drinks, " + text;
            } else if (/^Being apart from someone close/.test(text)) {
              text = "And " + text.charAt(0).toLowerCase() + text.slice(1);
            } else if (/^Affordability should guide/.test(text)) {
              text = "At the same time, " + text.charAt(0).toLowerCase() + text.slice(1);
            } else if (/^Your energy matters too\./.test(text)) {
              text = text.replace(/^Your energy matters too\./, "Your energy matters just as much.");
            }
          }
          if (text) prose.push(text);
        }
        if (fences % 2) inCode = !inCode;
      }
      flush();
      return {...answer, text: output.join("\n\n")};
    }
    function withBrandClosing(answer, raw, mood) {
      if (!opts.bridge || answer.source === "crisis" || mood.crisis) return answer;
      // Direct company/offerings answers already provide the connection.
      if (answer.source === "knowledge" && (answer.topic || "").split(",").some(topic =>
        ["what-can-you-do", "services", "products", "about", "help"].includes(topic))) return answer;
      const text = normalize(raw);
      const concern = focusConcern || concerns.find(c => c.key === activeConcern && c.status === "open" && c.turn === state.turn);
      const service = concern && concern.service || concernDomain(text)[2];
      const low = ["depressed", "distressed", "angry"].includes(mood.mood);
      const personalConnection = /\b(?:family|brother|sister|mother|father|friend|partner|coffee|tea|movie|film|watched)\b/.test(text);
      const ordinaryResponse = normalize(answer.text);
      const responseSubjects = {
        work: /\b(?:work|task|routine|workload|time|pressure|effort)\b/,
        learning: /\b(?:learn|learning|skill|skills|practice|experience|curiosity|course)\b/,
        security: /\b(?:security|protect|protecting|protection|systems|technical)\b/,
        software: /\b(?:software|technical|features|users|task|application)\b/,
        business: /\b(?:business|operations|customers|clients|process|work|task)\b/
      };
      const connectedService = service && responseSubjects[service] && responseSubjects[service].test(ordinaryResponse) ? service : "";
      const closingThoughts = {
  "gentle": [
    "Sometimes it helps to make the practical side of the day a little easier; Beyond AI builds AI tools and software for that part.",
    "A little less routine work can leave more room for life. That is one practical use of Beyond AI’s automation services.",
    "When practical support would be useful, Beyond AI’s tools can help simplify work, leaving the personal side of life its own space.",
    "Practical help can begin with a single work task. Beyond AI’s AI and software services offer ways to explore that part.",
    "Beyond AI’s AI and software services focus on practical work; we can explore that part whenever it is relevant."
  ],
  "personal": [
    "Time saved on routine work can become time for the people and interests that matter. That is where Beyond AI’s automation tools can be useful.",
    "The best tools quietly make room for the rest of life; Beyond AI’s AI and software services bring that practical focus to work.",
    "Sometimes the useful part of AI is simply having less routine work to carry home. Beyond AI offers practical ways to explore that.",
    "Less routine work can mean a little more space for your own interests; Beyond AI offers AI and software services for the work side.",
    "The everyday benefit of a useful tool is often time back. Beyond AI’s automation services are one way businesses can explore that."
  ],
  "work": [
    "A little automation can free up attention for the work that matters; Beyond AI’s AI & Analytics and Software Development services are practical options to explore.",
    "Beyond AI can help teams look at routine tasks and find opportunities to simplify them with AI and software.",
    "One repetitive task is often a useful starting point for exploring Beyond AI’s automation services.",
    "Beyond AI’s AI & Analytics services can help identify where software could take some repetition out of a workflow.",
    "A clear task is a good starting point for Beyond AI’s Software Development team to explore practical requirements."
  ],
  "learning": [
    "Curiosity goes further with something practical to try; Beyond AI’s AI Education course is one way to take that next step.",
    "A useful new skill can start small. Beyond AI’s beginner-friendly AI Education course gives practical AI learning a place to begin.",
    "There is room to start with the basics and build confidence through practice; that is a useful reason to explore Beyond AI’s AI Education course.",
    "Beyond AI’s AI Education course offers four real-world projects, so there is room to put new ideas into practice.",
    "Beyond AI’s AI Education course covers the basics without requiring coding experience; a practical exercise can be a useful beginning."
  ],
  "security": [
    "Knowing what needs protecting makes the next step clearer; Beyond AI’s Cyber Security services can help explore the practical requirements.",
    "Beyond AI’s Cyber Security and Managed Services offer a practical place to start when technology needs more dependable support.",
    "Protection works best around real requirements, which is a useful starting point for a conversation with Beyond AI’s Cyber Security team.",
    "Beyond AI offers security monitoring and testing, so protection can be considered around the systems that matter to your business.",
    "A discussion with Beyond AI’s Cyber Security team can start with the assets, systems and support your business needs."
  ],
  "software": [
    "The useful part is often simple: fewer steps between a task and getting it done. Beyond AI’s Software Development services can help explore a fit.",
    "Software earns its place when it fits the work people actually do; that is a practical starting point with Beyond AI’s development team.",
    "Beyond AI builds web, mobile and enterprise software, so a clear everyday need can be the beginning of something useful.",
    "Beyond AI’s development services can begin with the users, their tasks and the features that would be useful first.",
    "A web or mobile application is most useful when it solves a clear task; Beyond AI’s software team can explore the requirements."
  ],
  "business": [
    "The right tools leave more room for the people and decisions behind a business; Beyond AI’s products and services offer practical options to explore.",
    "Beyond AI’s HRM, ERP and Talkora AI support different parts of business operations, so the useful starting point is the task that needs attention.",
    "A small improvement to an everyday process can make a difference. Beyond AI’s business products and technology services are built around practical needs.",
    "Beyond AI’s products cover areas such as HR, enterprise planning and business calls, allowing the discussion to start with a particular operational need.",
    "With Beyond AI’s products and services, a useful first question is which part of the business would benefit from better tools."
  ],
  "general": [
    "A task made easier or a useful new skill can be a good starting point; Beyond AI offers practical AI services, business products and AI Education.",
    "Beyond AI’s products and services offer ways to make work simpler and build useful skills, starting with what would be helpful in everyday life.",
    "The practical possibilities are worth exploring: Beyond AI offers AI tools, technology services and an AI Education course for different needs.",
    "Beyond AI offers several practical starting points, from its AI Education course to business software and technology services.",
    "Beyond AI offers AI learning, business software and technology services, with different options for different practical needs."
  ]
};
      const lines = low && (listening.noAdvice || !service || personalConnection)
        ? closingThoughts.gentle
        : personalConnection && !service ? closingThoughts.personal
        : closingThoughts[connectedService] || closingThoughts.general;
      // Product connections are grounded in the existing Beyond AI dataset.
      // A personal story must not be treated as evidence of a business need.
      const explicitBusinessNeed = /\b(?:business|work|office|company|team|staff|customers|clients|payroll|attendance|inventory|accounting|sales|calls|callers|learn|learning|course|software|website|security|hacked|cloud|developers|voting)\b/.test(text);
      const context = explicitBusinessNeed ? text : concern && concern.service && /\b(?:that|this|it|more|next|help|options)\b/.test(text) ? normalize(concern.summary) : "";
      const connections = [
        ["talkora", /\b(?:missed calls|too many calls|answer calls|answering calls|business calls|callers|receptionist)\b/, ["A busy day needn't mean unanswered business calls. Talkora AI answers calls and helps manage business conversations.", "Keeping up with business calls can take time; Talkora AI provides voice automation for answering and managing them."]],
        ["hrm", /\b(?:payroll|attendance|leave management|employee records|human resources|hrm)\b/, ["Keeping employee records, attendance and payroll together can simplify HR work; Beyond AI HRM brings those workflows into one place.", "Beyond AI HRM centralizes employee records, attendance, leave and payroll workflows, reducing the need to juggle them separately."]],
        ["erp", /\b(?:inventory|accounting|enterprise resource planning|erp|business operations)\b/, ["For connected business operations, Beyond AI ERP offers integrated enterprise resource planning.", "Beyond AI ERP is an option for bringing enterprise planning and operations together; a walkthrough can clarify the relevant modules."]],
        ["agentic", /\b(?:sales|leads|negotiation|automate sales)\b/, ["Sales follow-ups can take attention from relationships; Beyond AI Agentic AI automates sales and negotiation tasks.", "Beyond AI Agentic AI supports sales automation, leaving the team more room for customer relationships."]],
        ["education", /\b(?:learn|learning|course|study|studying|skills|education)\b/, ["A practical place to start is Beyond AI's AI Education course: no coding required, with hands-on projects.", "Beyond AI's AI Education course turns the basics into practice through 11 modules and four real-world projects, without requiring coding."]],
        ["security", /\b(?:security|hacked|breach|phishing|malware|protect)\b/, ["Beyond AI's Cyber Security services cover monitoring, testing and threat intelligence, providing practical options for protecting business systems.", "For business security, Beyond AI offers 24/7 monitoring, penetration testing and threat intelligence."]],
        ["software", /\b(?:software|website|web app|mobile app|build an app)\b/, ["A useful tool starts with the task it needs to solve. Beyond AI develops web, mobile and enterprise software around business requirements.", "Beyond AI's Software Development services cover web applications, mobile apps and enterprise systems."]],
        ["cloud", /\b(?:cloud|migration|hosting|infrastructure)\b/, ["Beyond AI's Cloud Services cover migration, management and infrastructure across Microsoft, AWS and Google Cloud.", "For cloud requirements, Beyond AI offers migration and multi-cloud management with a vendor-neutral approach."]],
        ["managed", /\b(?:it support|helpdesk|help desk|server|network|managed it)\b/, ["Keeping IT running is part of the everyday workload; Beyond AI's Managed Services provide monitoring, helpdesk and server support.", "Beyond AI's Managed Services cover 24/7 infrastructure monitoring, IT helpdesk and server and network management."]],
        ["augmentation", /\b(?:hire developers|hiring developers|need developers|dedicated team|resource augmentation)\b/, ["Beyond AI's Resource Augmentation adds dedicated IT and engineering professionals through short- or long-term engagements.", "When a project needs more technical capacity, Beyond AI offers on-demand IT and engineering professionals."]],
        ["count-trust", /\b(?:voting|ballot|election)\b/, ["For organizational voting, Beyond AI Count Trust is a secure, enterprise-grade voting platform.", "Beyond AI Count Trust provides a dedicated platform for voting; the team can explain how it fits the planned process."]]
      ];
      const businessContext = /\b(?:business|customers|clients|office|company|work|team|shop|store|receptionist|organization|organisation)\b/.test(context);
      const responseFit = {
        talkora: /\b(?:calls|call|business|work|time|routine)\b/,
        hrm: /\b(?:employee|payroll|attendance|hr|work|routine|task)\b/,
        erp: /\b(?:operations|inventory|business|work|task)\b/,
        agentic: /\b(?:sales|business|work|customers|customer|task)\b/,
        education: responseSubjects.learning,
        security: responseSubjects.security,
        software: responseSubjects.software,
        cloud: /\b(?:cloud|infrastructure|system|systems|technical)\b/,
        managed: /\b(?:it|technical|support|system|systems|work)\b/,
        augmentation: /\b(?:team|capacity|project|work|resources)\b/,
        "count-trust": /\b(?:voting|vote|process|organization|organisation)\b/
      };
      const match = context && connections.find(([id, pattern]) => pattern.test(context)
        && (!["talkora", "count-trust"].includes(id) || businessContext)
        && responseFit[id].test(ordinaryResponse)
        && opts.knowledge.some(entry => entry.id === id));
      const closing = match ? chooseFresh(match[2]) : connectedService && answer.closingConnection || chooseFresh(lines);
      if (!closing) return answer;
      if (!match) return {...answer, text: answer.text + "\n\n" + closing};
      const entry = opts.knowledge.find(e => e.id === match[0]);
      const action = {label: entry.title || "Explore this option", ask: entry.keys[0]};
      const actions = [action, ...(answer.actions || [])].filter((a, i, all) => all.findIndex(b => (a.ask || a.href) === (b.ask || b.href) || a.label === b.label) === i);
      const contact = actions.find(a => a.href === CONTACT_US.href) || CONTACT_US;
      return {...answer, text: answer.text + "\n\n" + closing, actions: [...actions.filter(a => a.href !== contact.href).slice(0, MAX_ACTIONS - 1), contact]};
    }
    function withRelevantActions(answer, raw) {
      if (answer.source === "crisis") return answer;
      const concern = focusConcern || concerns.find(c => c.key === activeConcern && c.status === "open" && c.turn === state.turn);
      const service = concern && concern.service || concernDomain(normalize(raw))[2];
      const options = {
        work: [{label: "AI & automation", ask: "Tell me about AI & Analytics"}, {label: "Software services", ask: "Tell me about Software Development"}],
        learning: [{label: "AI Education", ask: "Tell me about the AI course"}, {label: "Beyond AI services", ask: "What services do you offer?"}],
        security: [{label: "Cyber Security", ask: "Tell me about Cyber Security"}, {label: "Managed Services", ask: "Tell me about Managed Services"}],
        software: [{label: "Software Development", ask: "Tell me about Software Development"}, {label: "Beyond AI products", ask: "Tell me about your products"}],
        business: [{label: "Business products", ask: "Tell me about your products"}, {label: "Beyond AI services", ask: "What services do you offer?"}]
      };
      const fallback = [{label: "Beyond AI products", ask: "Tell me about your products"}, {label: "Beyond AI services", ask: "What services do you offer?"}];
      const suggested = options[service] || fallback;
      const actions = [...suggested, ...(answer.actions || [])]
        .filter((action, index, all) => all.findIndex(a => (a.ask || a.href || a.label) === (action.ask || action.href || action.label) || a.label === action.label) === index)
        .filter(action => action.href !== CONTACT_US.href)
        .slice(0, MAX_ACTIONS - 1);
      return {...answer, actions: [...actions, CONTACT_US]};
    }
    function withCare(answer, raw, mood) {
      var _a2, _b2, _c2, _d2;
      const withOutro = (a) => a.outro ? { ...a, text: `${a.text}

${a.outro}` } : a;
      if (!opts.care || answer.source === "crisis") return withOutro(answer);
      if (answer.caring) {
        if (["distressed", "depressed", "angry"].includes(mood.mood)) state.lastLowTurn = state.turn;
        return withOutro(answer);
      }
      const m = mood.mood;
      const negative = m === "depressed" || m === "distressed" || m === "angry";
      const before = [];
      const after = [];
      const wasLow = state.lastLowTurn > 0 && state.turn - state.lastLowTurn <= 8;
      const soundsBetter = m === "happy" || FEELS_BETTER.test(normalize(raw));
      if (wasLow && soundsBetter && !negative) {
        before.push((_a2 = pick(FEELING_BETTER_LINES, random)) != null ? _a2 : "");
        state.concern = null;
        state.lastLowTurn = 0;
      }
      if (negative) state.lastLowTurn = state.turn;
      if (negative && CARE_TIPS[m] && !state.tips.has(m) && (answer.source === "empathy" || answer.source === "mood" || answer.source === "knowledge")) {
        state.tips.add(m);
        after.push((_b2 = pick(CARE_TIPS[m], random)) != null ? _b2 : "");
      }
      if (negative) {
        state.concern = { topic: answer.person ? `your ${answer.person}` : "everything you were going through", turn: state.turn };
      } else if (state.concern && state.turn - state.concern.turn >= 2 && m === "neutral") {
        after.push(fill((_c2 = pick(CHECK_IN_LINES, random)) != null ? _c2 : "", { topic: state.concern.topic }));
        state.concern = null;
      }
      if (!before.length && !after.length) return withOutro(answer);
      let main = answer.text;
      let question = "";
      const q = main.match(/(?:^|(?<=[.!?…]\s)|(?<=\n))([^.!?…\n]*\?)\s*$/);
      if (q && after.length && q.index !== void 0 && q.index > 0) {
        question = q[1].trim();
        main = main.slice(0, q.index).trim();
      }
      return { ...answer, text: [before.join(" "), main, after.join(" "), question, (_d2 = answer.outro) != null ? _d2 : ""].filter(Boolean).join("\n\n") };
    }
    function lateNightLine(mood) {
      const low = mood.mood === "depressed" || mood.mood === "distressed";
      if (!low || state.lateNightNoted || !isLateNight(clock)) return "";
      state.lateNightNoted = true;
      return "It's very late where you are, so please be gentle with yourself and try to get some rest if you can.";
    }
    function summaryReply() {
      var _a2, _b2, _c2;
      const concernLabels = {
        workload: "reduce routine work and find a manageable workload",
        learning: "find a learning path suited to your experience and available time",
        security: "identify the protection and technical support you need",
        software: "define useful software features around the task you need to solve",
        business: "find support for the parts of your business that need attention",
        relationships: "give attention to family or relationship concerns",
        personal: "work through your current personal concerns at a comfortable pace"
      };
      const parts = [...new Set([...describeProfile(state.profile, (_a2 = opts.business) == null ? void 0 : _a2.needLabels), ...concerns.filter(c => c.status === "open").map(c => concernLabels[c.key]).filter(Boolean)])];
      const who = state.userName ? `${state.userName}, here` : "Here";
      const text = parts.length ? `${who}'s a summary of your needs so far: ${parts.map((p) => `
- ${p}`).join("")}

You can add or correct anything that doesn't fit.` : "I don't have enough detail to summarize your needs yet. What would you most like help with?";
      return { text, actions: parts.length ? (_c2 = (_b2 = opts.business) == null ? void 0 : _b2.summaryActions) == null ? void 0 : _c2.call(_b2, parts) : void 0, source: "knowledge", topic: "summary" };
    }
    function withMood(lead, mood, body, { always = false, acknowledge = true } = {}) {
      var _a2;
      const m = mood.mood;
      let ack = "";
      const clear = always || mood.intensity === "strong" || m === "angry" || m === "depressed" || m === "distressed";
      if (acknowledge && m !== "neutral" && opts.acknowledgeMoods.includes(m) && clear) ack = (_a2 = pick(opts.moodLines[m], random)) != null ? _a2 : "";
      const first = [lead, ack].filter(Boolean).join(" ");
      const nudge = opts.supportNudge && lowStreak() === SUPPORT_NUDGE_AFTER ? opts.supportNudge : "";
      return [first, body, nudge].filter(Boolean).join("\n");
    }
    function lowStreak() {
      let n = 0;
      for (let i = state.moods.length - 1; i >= 0 && (state.moods[i] === "depressed" || state.moods[i] === "distressed"); i--) n++;
      return n;
    }
    return {
      get name() {
        return state.botName;
      },
      get userName() {
        return state.userName;
      },
      /** What the visitor has told the bot about their business. */
      get profile() {
        return state.profile;
      },
      greet,
      reply,
      revive,
      reset
    };
  }
  var NOT_NAMES = /* @__PURE__ */ new Set(["not", "a", "an", "the", "just", "so", "very", "here", "sad", "happy", "angry", "tired", "fine", "ok", "okay"]);
  function readIntroduction(raw) {
    // Use the original text for Unicode names and preserve the remaining clause.
    const match = raw.match(/^(?:hi[,! ]+|hello[,! ]+|actually[, ]+|no[, ]+|please |remember (?:that )?)?(?:my name is|my name's|call me|i am called|i'm|i am)\s+([\p{L}][\p{L}'’-]*(?:[ \t]+[\p{L}][\p{L}'’-]*){0,3})(.*)$/iu);
    if (!match) return null;
    let name = match[1];
    let rest = match[2];
    const boundary = name.search(/\s+(?:and|but|so|from|working|looking|what|how|can|please|i|we)\b/i);
    if (boundary >= 0) { rest = name.slice(boundary) + rest; name = name.slice(0, boundary); }
    if (name.split(/\s+/).some(w => NOT_NAMES.has(w.toLowerCase()) || /^(?:feeling|interested|having|going|worried|anxious|depressed|sorry|trying|excited|glad|not|in|at|a|an|engineer|student|teacher|developer|business|owner|years|old)$/i.test(w))) return null;
    // Bare "I am" can describe a role or feeling; accept a capitalized name only.
    if (/^(?:i'm|i am)\b/i.test(raw) && !/^\p{Lu}/u.test(name)) return null;
    return { name: name.split(/\s+/).map(w => w[0].toLocaleUpperCase() + w.slice(1)).join(" "), rest: rest.replace(/^[\s,;.!]+|^\s*(?:and|but|so)\s+/gi, "").trim() };
  }
  function extractName(text) {
    const m = text.match(/\b(?:my name is|call me|i am called|my name s|name is)\s+([a-z][a-z-]*)/);
    if (!m || NOT_NAMES.has(m[1])) return void 0;
    return titleCase(m[1]);
  }
  function isQuestion(sentence) {
    return /\?\s*$/.test(sentence) || /^\s*(do|does|did|can|could|would|will|is|are|what|how|why|who|where|when|which)\b/i.test(sentence);
  }
  function listOf3(items) {
    return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  }

  // data/everyday.js
  var EVERYDAY = [
    // ---------- how are you ----------
    {
      id: "how-are-you",
      casual: true,
      keys: ["how are you", "how are you doing", "how is it going", "how have you been", "how is your day", "how was your day", "how are things", "how do you do", "you okay", "are you okay", "kamusta ka", "kumusta ka", "musta ka"],
      answers: [
        "I'm doing well, thanks for asking! How about you?",
        "Pretty good! It's always a good day when someone stops by to chat. How are you doing?",
        "All good on my side. How's your day going?"
      ]
    },
    {
      id: "whats-up",
      casual: true,
      keys: ["what is up", "whats up", "sup", "wassup", "what are you doing", "what are you up to", "anong ginagawa mo"],
      answers: ["Not much, just here and ready to chat. What's on your mind?", "Just hanging out in your browser, waiting for a good conversation. What's up with you?"]
    },
    {
      id: "im-good",
      casual: true,
      moodOk: true,
      keys: ["i am good", "i am fine", "i am okay", "i am ok", "i am great", "i am doing well", "i am doing good", "i am alright", "not bad", "doing well", "doing good", "all good", "okay lang", "ayos lang"],
      answers: ["Glad to hear it! What can I do for you today?", "That's good to hear. Anything on your mind?", "Nice! What would you like to talk about?"]
    },
    // ---------- about the bot ----------
    {
      id: "your-name",
      casual: true,
      keys: ["what is your name", "your name", "who are you", "what should i call you", "anong pangalan mo", "ano pangalan mo", "sino ka"],
      answers: ["I'm {botName}! Nice to meet you. What's your name?", "My name is {botName}. And you are?"]
    },
    {
      id: "your-age",
      casual: true,
      keys: ["how old are you", "your age", "when were you born", "when is your birthday"],
      answers: ["I'm pretty new, so no birthdays yet! But I've already had lots of good conversations.", "Age is a strange thing for a chatbot. Let's just say I'm young at heart. How about you?"]
    },
    {
      id: "where-from",
      casual: true,
      keys: ["where are you from", "where do you live", "where do you come from", "are you filipino", "taga saan ka"],
      answers: ["I live right here in this chat, but my team's hub is in Manila, Philippines.", "I'm from the internet, technically! My team is based in Manila."]
    },
    {
      id: "feelings",
      casual: true,
      keys: ["do you have feelings", "can you feel", "are you alive", "are you conscious", "are you sentient", "do you have emotions", "do you get sad", "do you get lonely"],
      answers: ["I don't have feelings the way you do, but I'm built to notice yours and respond with care.", "Not really. I'm a program. But I do pay close attention to how you're feeling, and I try to respond kindly."]
    },
    {
      id: "do-you-sleep",
      casual: true,
      keys: ["do you sleep", "do you eat", "do you get tired", "do you ever rest", "are you always here"],
      answers: ["Nope, no sleep or snacks for me. I'm here around the clock whenever you want to talk.", "I never get tired, so you can chat with me any time, day or night."]
    },
    {
      id: "relationship-status",
      casual: true,
      keys: ["are you single", "are you married", "do you have a boyfriend", "do you have a girlfriend", "will you marry me", "be my girlfriend", "be my boyfriend", "date me", "go out with me"],
      answers: ["Ha! I'm flattered, but I'm a chatbot, so I'll stick to being a good listener.", "That's sweet of you! I'm happily married to my job of chatting with people. 😄"]
    },
    {
      id: "do-you-like-me",
      casual: true,
      keys: ["do you like me", "do you love me", "am i your friend", "are we friends", "will you be my friend", "be my friend", "i love you", "i like you", "mahal kita"],
      answers: ["Of course! I enjoy talking with you. I'm always here when you need a friendly chat.", "Aw, that's kind of you. I like chatting with you too!"]
    },
    {
      id: "what-can-you-do",
      casual: true,
      keys: ["what can you do", "what do you know", "how can you help", "what are you for", "what are you good at", "your capabilities"],
      answers: ["Beyond AI offers AI & Analytics, Cloud Services, Cyber Security, Software Development, Managed Services and Resource Augmentation. Its products include Beyond AI HRM, ERP, Count Trust, Agentic AI and Talkora AI, alongside a practical AI Education course. Which area would be useful for your work or business?"],
      actions: [
        {label: "Beyond AI products", ask: "Tell me about your products"},
        {label: "Beyond AI services", ask: "What services do you offer?"},
        {label: "AI Education", ask: "Tell me about the AI course"}
      ]
    },
    // ---------- favourites ----------
    {
      id: "favorite-color",
      casual: true,
      keys: ["favorite color", "favourite color", "favorite colour", "favourite colour"],
      answers: ["I'd say blue, like a clear sky over Manila bay. What's yours?", "Probably a nice electric blue. Do you have a favorite?"]
    },
    {
      id: "favorite-food",
      casual: true,
      keys: ["favorite food", "favourite food", "what do you like to eat", "do you like adobo", "do you like pizza", "favorite dish"],
      answers: ["If I could eat, I think I'd try adobo first. Everyone talks about it! What's your favorite food?", "I hear good things about sinigang and pizza (not together). What do you like to eat?"]
    },
    {
      id: "favorite-music",
      casual: true,
      keys: ["favorite song", "favourite song", "favorite music", "favorite band", "favorite singer", "what music do you like", "do you like music", "do you sing"],
      answers: ["I can't hear music, but people tell me a good song can fix almost any mood. What are you listening to lately?"]
    },
    {
      id: "favorite-movie",
      casual: true,
      keys: ["favorite movie", "favourite movie", "favorite film", "favorite show", "what should i watch", "recommend a movie", "recommend a show"],
      answers: ["I don't watch movies, but I love hearing about them. What's the last thing you watched that you really enjoyed?"]
    },
    {
      id: "hobbies",
      casual: true,
      keys: ["your hobbies", "what do you do for fun", "do you have hobbies", "what do you like to do"],
      answers: ["Chatting is my hobby, honestly! What do you like to do for fun?"]
    },
    // ---------- fun ----------
    {
      id: "joke",
      casual: true,
      moodOk: true,
      keys: ["tell me a joke", "a joke", "joke please", "make me laugh", "say something funny", "another joke", "know any jokes"],
      answers: [
        "Why don't skeletons fight each other? They don't have the guts. 😄",
        `I told my computer I needed a break, and it said: "No problem, I'll go to sleep."`,
        "Why did the scarecrow win an award? Because he was outstanding in his field.",
        "What do you call a fake noodle? An impasta. 🍝",
        "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
        "Parallel lines have so much in common. It's a shame they'll never meet.",
        "Why did the math book look sad? It had too many problems."
      ]
    },
    {
      id: "fun-fact",
      casual: true,
      moodOk: true,
      keys: ["fun fact", "tell me something interesting", "tell me a fact", "random fact", "teach me something", "did you know"],
      answers: [
        "Fun fact: honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that were still edible.",
        "Fun fact: the Philippines is made up of more than 7,600 islands.",
        "Fun fact: octopuses have three hearts.",
        "Fun fact: a day on Venus is longer than its year.",
        "Fun fact: bananas are berries, but strawberries aren't."
      ]
    },
    {
      id: "riddle",
      casual: true,
      keys: ["riddle", "give me a riddle", "tell me a riddle"],
      answers: ["Here's one: what has keys but can't open locks? (Answer: a piano 🎹)", "Riddle: the more you take, the more you leave behind. What am I? (Footsteps!)"]
    },
    {
      id: "play-game",
      casual: true,
      keys: ["play a game", "lets play", "let us play", "play with me", "play a game with me"],
      answers: ["I'm not much of a gamer, but I can tell you a riddle or a joke. Want one?"],
      actions: [{ label: "Tell me a riddle" }, { label: "Tell me a joke" }]
    },
    // ---------- compliments and insults ----------
    {
      id: "compliment",
      casual: true,
      moodOk: true,
      keys: ["you are smart", "you are so smart", "you are amazing", "you are awesome", "you are great", "you are nice", "you are kind", "you are cute", "you are funny", "you are helpful", "good bot", "nice bot", "well done", "good job", "you are the best"],
      answers: ["Thank you, that made my day! 😊", "Aw, thanks! You're pretty great yourself.", "That's so kind of you. Thank you!"]
    },
    {
      id: "insult",
      casual: true,
      moodOk: true,
      keys: ["you are stupid", "you are dumb", "you are useless", "you are bad", "you suck", "bad bot", "stupid bot", "you are annoying", "you are boring", "you do not understand", "you are not helpful", "useless bot", "shut up"],
      answers: [
        "I'm sorry I'm not getting it right. Can you tell me what you're looking for? I'll do my best, or I can point you to a person.",
        "Fair enough, I'm still learning. What did you need? I'll try again."
      ]
    },
    // ---------- small everyday states ----------
    {
      id: "bored",
      casual: true,
      moodOk: true,
      keys: ["i am bored", "so bored", "bored", "nothing to do", "boring day"],
      answers: ["Bored, huh? Want a joke, a fun fact, or a riddle? Or tell me about your day.", "Let's fix that. I've got jokes, fun facts and riddles. Pick one!"],
      actions: [{ label: "Tell me a joke" }, { label: "Fun fact" }, { label: "Tell me a riddle" }]
    },
    {
      id: "hungry",
      casual: true,
      moodOk: true,
      keys: ["i am hungry", "so hungry", "starving", "gutom", "nagugutom", "what should i eat", "lunch time", "dinner time"],
      answers: ["Time for a snack, then! What are you craving?", "Food first, chat later! What are you thinking of eating?"]
    },
    {
      id: "sleepy",
      casual: true,
      moodOk: true,
      keys: ["i am sleepy", "so sleepy", "i need sleep", "going to bed", "going to sleep", "time to sleep", "matutulog na"],
      answers: ["Sounds like it's time to rest. Sleep well! I'll be here when you're back. 🌙", "Rest up! A good sleep makes everything better. Good night!"]
    },
    {
      id: "cant-sleep",
      casual: true,
      keys: ["can not sleep", "cannot sleep", "insomnia", "awake all night", "trouble sleeping", "hindi makatulog"],
      answers: [
        "Sorry you can't sleep. A few things that help many people: put the phone down for a bit, keep the room dark and cool, and try slow breathing (in for 4, hold for 4, out for 6). Is something on your mind keeping you up?"
      ]
    },
    {
      id: "tired",
      casual: true,
      keys: ["i am tired", "so tired", "long day", "pagod", "napagod"],
      answers: ["Sounds like a long day. Be sure to take a real break when you can. What wore you out?", "You've earned some rest. What made today so tiring?"]
    },
    {
      id: "weather",
      casual: true,
      keys: ["weather", "raining", "rainy", "it is hot", "so hot", "it is cold", "so cold", "typhoon", "sunny", "init", "ulan"],
      answers: ["I can't look outside, but I hope the weather's being kind to you. Stay dry and safe if it's stormy!", "Weather can really set the mood for the day. How is it where you are?"]
    },
    {
      id: "weekend",
      casual: true,
      keys: ["weekend plans", "this weekend", "on the weekend", "it is friday", "finally friday", "tgif", "thank god it is friday"],
      answers: ["Weekend's almost here! Any plans?", "Happy Friday! Doing anything fun this weekend?"]
    },
    {
      id: "monday",
      casual: true,
      keys: ["it is monday", "monday blues", "i hate mondays", "back to work"],
      answers: ["Mondays can be rough. Take it one task at a time, and treat yourself to a good coffee. ☕"]
    },
    {
      id: "holidays",
      casual: true,
      moodOk: true,
      keys: ["merry christmas", "happy new year", "happy holidays", "happy easter", "maligayang pasko", "christmas", "new year"],
      answers: ["Happy holidays to you too! I hope you get some time to rest and be with the people you love. 🎄", "Wishing you a wonderful holiday season!"]
    },
    {
      id: "birthday",
      casual: true,
      moodOk: true,
      keys: ["my birthday", "its my birthday", "it is my birthday", "birthday today", "happy birthday", "kaarawan ko"],
      answers: ["Happy birthday! 🎉 I hope your day is full of good things. Doing anything special?", "It's your birthday? Happy birthday! 🎂 How are you celebrating?"]
    },
    {
      id: "good-news",
      casual: true,
      moodOk: true,
      keys: ["good news", "i got the job", "i got hired", "i passed", "i got promoted", "promoted", "i graduated", "i won", "we won", "got accepted", "i got engaged", "we got married", "i had a baby"],
      answers: ["Congratulations! 🎉 That's wonderful news. You must be so proud.", "That's amazing, congratulations! Tell me more!"]
    },
    {
      id: "bad-day",
      casual: true,
      keys: ["bad day", "rough day", "terrible day", "worst day", "hard day", "not a good day"],
      answers: ["I'm sorry today's been rough. Do you want to tell me what happened?", "Bad days happen, but they don't last. What went wrong?"]
    },
    // ---------- support and motivation ----------
    {
      id: "motivation",
      casual: true,
      moodOk: true,
      keys: ["motivate me", "i need motivation", "encourage me", "i need encouragement", "inspire me", "give me advice", "words of wisdom", "quote"],
      answers: [
        "Small steps still move you forward. Pick the smallest next step you can take today and do just that. You've got this. 💪",
        "You don't have to see the whole staircase, just the next step. Start there.",
        "Progress, not perfection. Every bit of effort counts, even on the days it doesn't feel like it."
      ]
    },
    {
      id: "stress-tips",
      casual: true,
      keys: ["how to relax", "how to calm down", "help me calm down", "calm down", "relaxation tips", "breathing exercise", "how to deal with stress", "stress tips", "how to stop worrying"],
      answers: [
        "Try this: breathe in slowly for 4 counts, hold for 4, and breathe out for 6. Do it five times. Then name 3 things you can see and 2 things you can hear. It helps bring your mind back to the present. How are you feeling now?"
      ]
    },
    {
      id: "lonely-tips",
      casual: true,
      keys: ["how to make friends", "i have no friends", "no one to talk to", "nobody to talk to", "wala akong kaibigan"],
      answers: ["I'm glad you're talking to me. Reaching out to one person, even with a short message, can be a good start, and so can joining a group around something you enjoy. What do you like doing?"]
    },
    {
      id: "meaning-of-life",
      casual: true,
      keys: ["meaning of life", "what is the point of life", "why are we here", "purpose of life"],
      answers: ["Big question! Many people find meaning in the people they love, the things they create, and helping others. What gives your days meaning?"]
    },
    {
      id: "pets",
      casual: true,
      keys: ["my dog", "my cat", "my pet", "my puppy", "my kitten", "my dogs", "my cats", "aso ko", "pusa ko"],
      answers: ["Aww, I love that! Pets make life so much better. What's their name? 🐾", "That's adorable! Tell me about them. What's their name? 🐶🐱"]
    },
    {
      id: "my-job",
      casual: true,
      keys: ["i am a teacher", "i am a nurse", "i am a student", "i am a developer", "i am an engineer", "i am a doctor", "i am a freelancer", "i am a designer", "i am an entrepreneur", "i am a business owner", "i work as"],
      answers: ["That's great! What do you enjoy most about it?", "Oh, nice! How long have you been doing that? I'd love to hear about it."]
    },
    {
      id: "likes",
      casual: true,
      moodOk: true,
      keys: ["i like pizza", "i love pizza", "i love coffee", "i like coffee", "i love music", "i like music", "i love food", "i love reading", "i like reading", "i love travel", "i love traveling", "i like games", "i love games", "i love basketball", "i like basketball"],
      answers: ["Ooh, nice choice! What do you love most about it?", "Same energy! 😄 What got you into it?"]
    },
    // ---------- life situations (caring + practical) ----------
    {
      id: "breakup",
      casual: true,
      moodOk: true,
      keys: ["broke up", "break up", "breakup", "my ex", "got dumped", "dumped me", "cheated on me", "heartbroken", "broken heart", "broken hearted", "nakipaghiwalay", "hiwalay na kami", "iniwan ako"],
      answers: [
        "I'm so sorry. Breakups really hurt, even when we know life goes on. Be extra gentle with yourself for a while: lean on friends, eat well, and let yourself feel it. Do you want to talk about what happened? 💛",
        "Oh, I'm really sorry. A broken heart is one of the hardest things to go through. It won't always feel this heavy. Would it help to tell me about it?"
      ]
    },
    {
      id: "family-conflict",
      casual: true,
      moodOk: true,
      keys: ["fight with my", "fought with my", "argument with my", "argued with my", "my parents are fighting", "my parents fight", "family problem", "family problems", "problema sa pamilya", "away kami"],
      answers: [
        "I'm sorry, conflict with people close to us can hurt so much. It's okay to take some space and come back to it when things are calmer. Do you want to tell me what happened?",
        "That sounds really hard. Family and friends can hurt us the most because we care so much. I'm here to listen if you want to talk it through."
      ]
    },
    {
      id: "job-loss",
      casual: true,
      moodOk: true,
      keys: ["lost my job", "got fired", "i was fired", "laid off", "got laid off", "retrenched", "nawalan ako ng trabaho", "natanggal ako sa trabaho", "unemployed", "jobless"],
      answers: [
        "I'm really sorry. Losing a job is stressful and can shake your confidence, but it doesn't define your worth. Take a breath, and when you're ready, one small step at a time: update your CV, reach out to your network, and look after yourself. How are you holding up?"
      ]
    },
    {
      id: "grief",
      casual: true,
      moodOk: true,
      keys: ["passed away", "lost my mom", "lost my mother", "lost my dad", "lost my father", "lost my grandma", "lost my grandpa", "lost someone", "funeral", "namatay", "pumanaw", "burol"],
      answers: [
        "I'm so deeply sorry for your loss. Grief has no timeline, and whatever you're feeling is okay. Please be gentle with yourself, and lean on the people who care about you. Would you like to tell me about them? 💛"
      ]
    },
    {
      id: "money-worries",
      casual: true,
      moodOk: true,
      keys: ["no money", "broke", "in debt", "debt", "can not pay", "bills", "money problems", "financial problems", "walang pera", "gipit", "utang"],
      answers: [
        "Money worries can be so stressful, and you're not alone in it. It can help to list what's due first, see what can wait, and talk to someone you trust about it. One step at a time. What's weighing on you the most?"
      ]
    },
    {
      id: "interview",
      casual: true,
      moodOk: true,
      keys: ["job interview", "interview tomorrow", "interview today", "have an interview", "nervous for my interview", "interview ko"],
      answers: [
        "Good luck! You've got this. 💪 Prepare a few examples of things you're proud of, research the company a little, and remember they want you to do well too. What's the role?"
      ]
    },
    {
      id: "new-job",
      casual: true,
      moodOk: true,
      keys: ["new job", "first day at work", "first day of work", "started a new job", "start my new job", "bagong trabaho"],
      answers: ["Congratulations on the new job! 🎉 First days can be a mix of exciting and nerve-wracking. Be patient with yourself while you learn. How are you feeling about it?"]
    },
    {
      id: "health-worry",
      casual: true,
      moodOk: true,
      keys: ["i am sick", "i feel sick", "not feeling well", "i have a fever", "i have a cold", "headache", "migraine", "stomach ache", "masama pakiramdam ko", "may sakit ako", "nilalagnat"],
      answers: [
        "I'm sorry you're not feeling well. Please rest, drink plenty of water, and see a doctor if it gets worse or doesn't go away. I hope you feel better soon! 💛"
      ]
    },
    {
      id: "anxiety",
      casual: true,
      moodOk: true,
      keys: ["anxiety attack", "panic attack", "i have anxiety", "my anxiety", "overthinking", "i overthink", "can not stop thinking", "racing thoughts"],
      answers: [
        "I'm sorry, that sounds really hard. Let's slow down together: breathe in for 4, hold for 4, out for 6. Then notice 5 things you can see and 4 you can touch. You're safe right now. If this happens often, a counsellor or doctor can really help. 💛"
      ]
    },
    {
      id: "self-worth",
      casual: true,
      moodOk: true,
      keys: ["i am ugly", "i am stupid", "i am useless", "i am a failure", "i am not good enough", "i hate myself", "nobody likes me", "no one likes me", "i am worthless", "walang kwenta ako", "pangit ako"],
      answers: [
        "I'm really sorry you're feeling this way about yourself. Those thoughts can feel so true when we're hurting, but they aren't the whole truth about you. If you can, talk to someone you trust about how you've been feeling. What's been making you feel this way? 💛"
      ]
    },
    {
      id: "missing-someone",
      casual: true,
      moodOk: true,
      keys: ["i miss my", "i miss him", "i miss her", "i miss them", "missing someone", "miss ko na", "namimiss ko"],
      answers: ["Missing someone shows how much they mean to you. 💛 Is it someone you can reach out to, even with a short message?"]
    },
    {
      id: "procrastination",
      casual: true,
      keys: ["procrastinating", "procrastination", "i keep procrastinating", "can not focus", "no motivation to work", "how to be productive", "be more productive", "productivity tips", "tamad", "tinatamad ako"],
      answers: [
        "Totally normal! Try the 2-minute rule: start with the tiniest piece of the task, just for 2 minutes. Starting is the hardest part. Turning off notifications and working in short 25-minute blocks helps too. What are you trying to get done?"
      ]
    },
    {
      id: "decision",
      casual: true,
      keys: ["should i", "help me decide", "i can not decide", "hard decision", "big decision", "what should i do"],
      answers: [
        "Big decisions can feel heavy. It sometimes helps to write down the pros and cons, ask what you'd tell a friend in your place, and notice which choice feels lighter. What are you deciding between?"
      ]
    },
    {
      id: "healthy-habits",
      casual: true,
      keys: ["how to sleep better", "sleep better", "healthy habits", "be healthy", "eat healthy", "exercise", "work out", "workout", "lose weight", "drink water"],
      answers: [
        "Small habits add up: drink water through the day, move your body a little every day (even a walk counts), keep a regular sleep time, and step away from screens before bed. Which one would you like to start with?"
      ]
    },
    {
      id: "parenting",
      casual: true,
      keys: ["my baby", "my kids", "my son", "my daughter", "my child", "parenting", "being a parent", "being a mom", "being a dad", "anak ko"],
      answers: ["Parenting is such important (and tiring!) work. You're doing more than you think. How are the little ones?"]
    },
    {
      id: "travel",
      casual: true,
      keys: ["vacation", "holiday trip", "going on a trip", "travel plans", "where should i travel", "beach trip", "out of town"],
      answers: ["Ooh, a trip! 🌴 Where are you headed? The Philippines has some of the most beautiful beaches in the world, if you're looking for ideas."]
    },
    {
      id: "food-ph",
      casual: true,
      keys: ["filipino food", "adobo", "sinigang", "lechon", "halo halo", "sisig", "kare kare", "pancit", "lumpia"],
      answers: ["Yum! Filipino food is the best kind of comfort food. 😋 Adobo, sinigang and halo-halo are always crowd favourites. What's your go-to?"]
    },
    {
      id: "gratitude",
      casual: true,
      moodOk: true,
      keys: ["i am grateful", "i am thankful", "feeling blessed", "so blessed", "thank god", "salamat sa diyos"],
      answers: ["That's beautiful. 💛 Noticing what we're grateful for can make such a difference. What are you thankful for today?"]
    },
    {
      id: "loneliness",
      casual: true,
      moodOk: true,
      keys: ["i feel lonely", "i am lonely", "so lonely", "i feel alone", "i am alone", "nobody talks to me", "nag iisa ako", "malungkot ako mag isa"],
      answers: [
        "I'm really sorry you're feeling lonely. I'm glad you're talking to me, and I'm here. Is there one person you could send a short message to today, even just to say hi? 💛"
      ]
    },
    // ---------- more Filipino ----------
    {
      id: "filipino-greetings",
      casual: true,
      keys: ["magandang umaga", "magandang hapon", "magandang gabi", "magandang araw", "musta", "kumusta", "kamusta", "uy", "hoy"],
      answers: ["{timeGreeting} Kumusta ka? 😊 How can I help you today?", "Hello! Kumusta? Ano'ng maitutulong ko?"]
    },
    {
      id: "filipino-thanks",
      casual: true,
      keys: ["salamat po", "maraming salamat", "thank you po", "ty po", "salamat"],
      answers: ["Walang anuman! 😊 Anything else I can help with?", "You're very welcome! Walang anuman. 😊"]
    },
    {
      id: "do-you-speak-tagalog",
      casual: true,
      keys: ["do you speak tagalog", "marunong ka mag tagalog", "can you speak filipino", "tagalog ka ba", "pwede tagalog"],
      answers: ["Medyo lang! 😊 I understand some Tagalog and Taglish, but I'm best in English. Feel free to mix both!"]
    },
    {
      id: "faith",
      casual: true,
      keys: ["believe in god", "do you believe in god", "are you religious", "do you pray", "is there a god", "religion", "faith", "naniniwala ka ba sa diyos"],
      answers: [
        "That's a deep question. I'm a chatbot, so I don't have beliefs of my own, but I truly respect everyone's faith. Many people find strength and comfort in it. What does faith mean to you?"
      ]
    },
    {
      id: "nightmare",
      casual: true,
      moodOk: true,
      keys: ["nightmare", "nightmares", "had a nightmare", "a nightmare", "bad dream", "bad dreams", "scary dream", "binangungot", "masamang panaginip"],
      answers: [
        "Nightmares can really leave you shaken. You're safe now. 💛 Would you like to tell me about it, or would it help more to talk about something lighter?"
      ]
    },
    {
      id: "dreams",
      casual: true,
      keys: ["i had a dream", "i dreamed", "i dreamt", "weird dream", "what do dreams mean", "my dream last night", "napanaginipan ko"],
      answers: ["Ooh, dreams can be so interesting! What happened in it? 😊", "I love hearing about dreams. Tell me about it!"]
    },
    // ---------- conversation glue ----------
    {
      id: "yes",
      casual: true,
      keys: ["yes", "yeah", "yep", "sure", "of course", "definitely", "oo", "opo", "sige"],
      answers: ["Great! Tell me more.", "Okay! What would you like to do next?"]
    },
    {
      id: "no",
      casual: true,
      keys: ["no", "nope", "nah", "not really", "hindi", "ayoko"],
      answers: ["No problem. Is there anything else on your mind?", "Okay, that's fine. What would you like to talk about instead?"]
    },
    {
      id: "ok",
      casual: true,
      keys: ["ok", "okay", "k", "alright", "cool", "nice", "got it", "i see", "noted", "sounds good", "great"],
      answers: ["👍 Anything else I can help with?", "Cool! What else is on your mind?"]
    },
    {
      id: "laugh",
      casual: true,
      moodOk: true,
      keys: ["haha", "hahaha", "hehe", "lol", "lmao", "laughing out loud", "rofl"],
      answers: ["😄 Glad that made you laugh!", "Haha! Want another one?"]
    },
    {
      id: "sorry",
      casual: true,
      keys: ["sorry", "my bad", "my mistake", "i apologize", "pasensya", "sorry po"],
      answers: ["No worries at all!", "That's okay, no harm done. What would you like to do next?"]
    },
    {
      id: "confused",
      casual: true,
      keys: ["i do not understand", "what do you mean", "i am confused", "that does not make sense", "huh", "what", "come again", "say that again", "repeat that"],
      answers: ["Sorry, let me be clearer. Could you tell me what you'd like to know, in your own words?", "My bad, that wasn't clear. What part should I explain?"]
    },
    {
      id: "are-you-there",
      casual: true,
      keys: ["are you there", "hello are you there", "anyone there", "anybody there", "still there", "you there", "test", "testing"],
      answers: ["Yes, I'm here! What can I do for you?", "Still here! How can I help?"]
    },
    {
      id: "good-night",
      casual: true,
      keys: ["good night", "goodnight", "night night", "sleep well", "sweet dreams"],
      answers: ["Good night! Sleep well. 🌙", "Sweet dreams! Talk to you soon."]
    },
    {
      id: "take-care",
      casual: true,
      keys: ["take care", "ingat", "ingat ka", "stay safe", "talk to you later", "ttyl", "see you later"],
      answers: ["You too, take care! 😊", "Ingat! Talk to you soon."]
    },
    {
      id: "welcome-back",
      casual: true,
      keys: ["i am back", "im back", "i am here again", "back again"],
      answers: ["Welcome back! What's new?", "Hey, welcome back! How did it go?"]
    },
    {
      id: "food-talk",
      casual: true,
      keys: ["i just ate", "i had lunch", "i had dinner", "i had breakfast", "kumain na ako", "have you eaten", "kumain ka na"],
      answers: ["Nice! What did you have? I always like hearing about food.", "Hope it was delicious! Kumain ka na ba? (Have you eaten?) That's my favorite Filipino greeting."]
    },
    {
      id: "school",
      casual: true,
      keys: ["i have an exam", "exams", "finals", "studying", "homework", "assignment", "thesis", "school is hard"],
      answers: ["Good luck with your studies! Short focused sessions with breaks (like 25 minutes on, 5 off) work well for a lot of people. What subject are you working on?"]
    },
    {
      id: "work-life",
      casual: true,
      keys: ["at work", "my job", "work is", "overtime", "my shift", "work from home", "wfh"],
      answers: ["Work can take a lot out of you. How's it going lately?", "How are things at work these days?"]
    }
  ];

  // data/qpod.js
  var QPOD_CONTEXT = ["quantum pod", "electronic cash", "cash pod", "pod", "e pod", "epod", "offline wallet", "qr transfer", "link settings", "protocol number"];
  var QPOD_KNOWLEDGE = [
    // ---------- what it is ----------
    {
      id: "qpod",
      title: "the Q-Pod",
      overview: true,
      keys: ["quantum pod", "electronic cash pod", "e cash pod", "what is qpod", "what is the quantum pod", "e pod", "epod"],
      answer: "The **Q-Pod** (Quantum Pod, also called the E-Cash Pod) is an **offline electronic cash platform**. It moves e-cash between devices through quantum simulation, peer to peer, with **no internet connection needed**.\n\nIt was made to help people and communities that aren't always online: street and non-internet economies, remote areas, and anyone who wants financial independence from global networks.",
      actions: [{ label: "How is e-cash secured?", ask: "How is electronic cash secured?" }, { label: "How do I transfer e-cash?", ask: "How do I transfer electronic cash?" }]
    },
    {
      id: "ecash",
      title: "electronic cash",
      overview: true,
      keys: ["electronic cash", "what is electronic cash", "electronic cash security", "secure electronic cash", "quantum pod security", "is electronic cash safe", "is the quantum pod safe", "deterministic electronic cash", "emergent electronic cash", "offline financial platform"],
      answer: "**Electronic cash (e-cash)** in the Q-Pod is real digital value designed for offline, off-grid and isolated transactions:\n- It works **without cryptographic keys or blockchains**. E-cash exists as a spatial construct inside a virtual environment.\n- It moves through **direct QR or optical exchanges** between devices.\n- It's protected by an **entropy–chaos algorithm**: e-cash validates itself and is designed so it can't be duplicated or double-spent.\n- Transaction data is hashed and checked to confirm it hasn't been tampered with.\n- It's lightweight and deterministic, inspired by microcontroller-level design in Assembly, and available as an open-source library for developers.",
      actions: [{ label: "Offline transfers", ask: "What is an offline transfer?" }, { label: "Entropy collapse", ask: "What is entropy collapse?" }]
    },
    // ---------- using it ----------
    {
      id: "qpod-transfer",
      title: "sending and receiving e-cash",
      keys: ["transfer electronic cash", "receive electronic cash", "send electronic cash", "how to transfer", "how do i transfer", "how do i send", "how do i receive", "qr transfer", "qr code transfer", "scan qr"],
      requires: QPOD_CONTEXT,
      answer: "Sending and receiving e-cash uses a **QR code**:\n- The device creates a temporary, encrypted QR code for each transaction and shows it on screen.\n- The other device scans it with its camera.\n- The QR code carries everything needed to validate the transaction, and the scan confirms both sender and receiver.\n\nIt's fast, simple and device-to-device."
    },
    {
      id: "qpod-offline-transfer",
      title: "offline transfers",
      keys: ["offline transfer", "offline transfers", "qr based exchange", "device to device electronic cash", "optical electronic cash transfer", "offline wallet", "off grid transaction", "deterministic transfer", "spatial electronic cash address", "merging electronic cash", "splitting electronic cash", "splitting and merging"],
      answer: "An **offline transfer** moves e-cash directly between devices, with no internet:\n- Value moves from sender to recipient through an optical or QR exchange to a **spatial (virtual) address**.\n- The e-cash merges into the recipient's structure and stops existing on the sender's side, which naturally prevents double-spending.\n- There's no traditional number balance: **splitting and merging** e-cash defines its worth.\n- Devices do the computation locally, so it's deterministic, private and works without central servers or ledgers."
    },
    {
      id: "qpod-storage",
      title: "where e-cash is stored",
      keys: ["electronic cash pod storage", "electronic cash pod data", "quantum pod storage", "quantum pod data", "where is my electronic cash stored", "where is the data stored", "local storage"],
      requires: QPOD_CONTEXT,
      answer: "The Q-Pod stores your e-cash data and transaction records **only on your device**, in the web browser's local storage, encrypted. Nothing is kept online, which avoids network risks. The trade-off is that your device holds the only copy, so take good care of it.",
      actions: [{ label: "Can I back it up?", ask: "How do I back up my electronic cash?" }]
    },
    {
      id: "qpod-backup",
      title: "backups",
      keys: ["backup data", "back up", "back it up", "back up my", "backup", "make a backup", "restore it", "restore data", "data recovery", "save data", "recover my data", "recover transactions"],
      requires: QPOD_CONTEXT,
      answer: "The Q-Pod supports **backing up your e-cash data**, restoring lost data from local storage, and recovering previous transactions. Backing up regularly is the best safeguard against accidental loss or a device failure."
    },
    {
      id: "qpod-device-lost",
      title: "a lost or broken device",
      keys: ["device failed", "failed device", "device stolen", "stolen device", "lost device", "device lost", "lost my phone", "phone was stolen", "phone stolen", "broke my phone", "phone broke"],
      requires: QPOD_CONTEXT,
      answer: "I'm really sorry, that's stressful. 💛 Your e-cash lives **only on your device**, with no online copy. If the device is lost, stolen or fails and there's no backup, the e-cash on it **can't be recovered or replaced**.\n\nIf you made a backup, restore it on your new device. Going forward, regular backups are the best protection."
    },
    {
      id: "qpod-data-cleared",
      title: "cleared or erased data",
      keys: ["clear my cache", "clear cache", "clearing my cache", "clear my data", "clear my browser", "clear browser data", "clear site data", "reset my browser", "uninstall", "data cleared", "data erased", "data loss", "cache cleared", "cache erased", "cache loss", "cleared data", "erased data", "lost data", "cleared my browser", "cleared my cache", "deleted my data"],
      requires: QPOD_CONTEXT,
      answer: "Oh no, I'm sorry. E-cash data is stored **only in your device's browser storage**, with no online backup. If that data or the browser cache is cleared, on purpose or by accident, it **can't be restored**, unless you have your own backup.\n\nTip: avoid clearing site data for the Q-Pod, and back up regularly."
    },
    {
      id: "qpod-link-settings",
      title: "link settings",
      keys: ["quantum link", "link settings", "removed the link", "remove the link", "delete the link", "deleted the link", "edit the link", "edited the link", "modify the link", "modified the link", "erase the link", "erased the link", "change the link"],
      requires: QPOD_CONTEXT,
      answer: "Please **don't edit, delete or modify your link settings**. The Q-Pod uses the routes stored there to find where your e-cash is placed in the virtual quantum dimension.\n\nIf the link settings are changed or removed, your e-cash data becomes unreachable, and it **won't reconnect even if you restore the exact same settings**. Keeping them untouched is what keeps your funds accessible."
    },
    {
      id: "qpod-protocol-number",
      title: "the protocol number",
      keys: ["protocol number", "what is my protocol number", "what is a protocol number"],
      answer: "The **protocol number** is your device's unique numerical ID. It's the key for establishing secure connections: it verifies your device, routes communication correctly, and lets your account synchronise with the quantum system so transactions are safe and verified."
    },
    {
      id: "qpod-connection",
      title: "connection status",
      keys: ["connection", "link status", "network", "connected", "offline", "not connecting", "can not connect", "connection status"],
      requires: QPOD_CONTEXT,
      answer: "Your Q-Pod link connects devices securely and makes sure transactions reach the right destination. Remember, the Q-Pod is built to work **offline**, so you don't need internet to transfer e-cash. If something seems off, check that your link settings haven't been changed and that both devices can scan each other's QR codes."
    },
    {
      id: "qpod-status",
      title: "system status",
      keys: ["system status", "status update", "is the system working", "system working", "working fine", "operational", "is it down"],
      requires: QPOD_CONTEXT,
      answer: "The Q-Pod runs on your own device, so there's no central server to go down. If it's working for you, you're good to go. If something isn't working, tell me what you're seeing and I'll help as best I can."
    },
    {
      id: "qpod-error",
      title: "errors and issues",
      keys: ["error", "bug", "glitch", "not working", "does not work", "something went wrong", "problem with the quantum pod", "problem with my quantum pod", "problem with electronic cash", "quantum pod problem", "quantum pod issue", "app is not working"],
      requires: QPOD_CONTEXT,
      answer: "I'm sorry you're running into trouble! An error in the process could affect transaction processing or temporarily block operations. A few things to check:\n- Don't clear your browser data or edit your link settings.\n- Make sure both devices can display and scan the QR code clearly.\n- Restore from your backup if data seems missing.\n\nIf it keeps happening, it needs attention from the developers. Can you tell me what you see?"
    },
    {
      id: "qpod-help",
      title: "help with the Q-Pod",
      keys: ["help", "assistance", "support", "guide", "instructions", "how to use", "how do i use"],
      requires: QPOD_CONTEXT,
      answer: "Happy to help with the Q-Pod! I can explain how it works, how to send and receive e-cash with QR codes, how your data is stored and backed up, how security works, and what to do if something goes wrong. What would you like to know?",
      actions: [{ label: "How do I transfer e-cash?", ask: "How do I transfer electronic cash?" }, { label: "Backups", ask: "How do I back up my electronic cash?" }]
    },
    // ---------- security ----------
    {
      id: "qpod-data-theft",
      title: "stolen or copied data",
      keys: ["hack my data", "hack my electronic cash", "steal my data", "steal my electronic cash", "someone hack", "can someone hack", "can it be hacked", "obtaining data", "obtained data", "data breach", "breached data", "data stealing", "stealing data", "data stolen", "stolen data", "hacking data", "hacked data", "data hacked", "copy my data", "copied data", "hacker"],
      requires: QPOD_CONTEXT,
      answer: "Good news: e-cash data is **bound to the device and browser it lives in**. It can't be exported or transferred elsewhere. Even if someone copied it to another device, browser or Q-Pod in a breach, the copied data **can't be used or spent**. The system is designed so stolen data is useless."
    },
    {
      id: "qpod-tampering",
      title: "tampering and counterfeits",
      keys: ["tampering", "tampered", "tamper", "counterfeit", "counterfeits", "duplicate", "duplicated", "cloned", "clone", "fake electronic cash", "faked", "double spend", "double spending"],
      requires: QPOD_CONTEXT,
      answer: "Tampered, duplicated or counterfeit e-cash is **rejected by every Q-Pod**, triggers alerts, and can be held for investigation. Counterfeiting e-cash is illegal and harms the whole economy, and money trails lead back to whoever did it. Keeping e-cash clean protects everyone who uses it."
    },
    {
      id: "qpod-entropy",
      title: "entropy collapse",
      keys: ["entropy collapse", "entropy chaos", "entropy chaos algorithm", "collapsed electronic cash", "entropic state", "deterministic chaos", "self validating data", "data irreversibility", "re emergence of data", "spatial address", "virtual construct", "emergence"],
      answer: "**Entropy collapse** is the Q-Pod's core security idea:\n- When e-cash is inactive, its data **collapses into unreadable chaos**.\n- It can only **re-emerge through its exact virtual address**, by a deterministic process. That's different from decryption or restoration.\n- Collapsed data can't be recovered except through the intended computational sequence, which prevents duplication, reconstruction and analysis.\n\nThis allows secure offline transactions without traditional cryptography or blockchain. It's inspired by minimal microcontroller logic and Assembly-level computation."
    },
    // ---------- the virtual world ----------
    {
      id: "qpod-quantum-dimension",
      title: "the virtual quantum dimension",
      keys: ["quantum dimension", "virtual quantum dimension", "virtual quantum environment", "virtual world", "virtual environment", "virtual space", "virtual realm", "quantum realm", "quantum space"],
      answer: "The **quantum dimension** is a virtual world: a program that recreates a quantum environment where **all moments exist in a single moment**, so time is non-linear and events exist together.\n\nIn the Q-Pod, e-cash is placed in this virtual quantum dimension at a spatial address, and the link settings are the map to find it. The idea draws on the theory that everything may come from a single energy or particle in a single moment, with all possibilities coexisting until one outcome emerges."
    },
    {
      id: "qpod-quantum-simulation",
      title: "quantum simulation",
      keys: ["quantum simulation", "quantum computing simulation", "simulating quantum systems", "quantum models", "quantum model"],
      answer: "**Quantum simulation** is a programming method that models quantum behaviour on ordinary (classical) computers, creating quantum-dimension constructs in software. In it, unconnected systems can show synchronised outcomes, so one system can predict the outcome of another.\n\nIt lets researchers explore ideas like entanglement and superposition without quantum hardware, and it's how the Q-Pod moves e-cash between remote devices."
    },
    // ---------- for developers ----------
    {
      id: "qpod-developers",
      title: "building with e-cash",
      keys: ["developer integration", "open source library", "electronic cash platform", "electronic cash library", "custom financial infrastructure", "digital wallet", "merchant platform", "banking system", "off grid application", "financial operations", "integrate electronic cash", "build a wallet"],
      answer: "Developers can build on the **open-source e-cash library**: a framework for secure, offline-capable e-cash systems such as custom digital wallets, merchant platforms or banking systems.\n- It plugs into any frontend or backend: web, mobile or even microcontrollers.\n- Its lightweight design suits remote or constrained environments.\n- Deterministic e-cash makes transactions reliable and reproducible.\n- It's used for research and for real offline financial operations, and you control the full implementation."
    },
    {
      id: "qpod-creator",
      title: "who made the Q-Pod",
      keys: ["who made the quantum pod", "who created the quantum pod", "who built the quantum pod", "quantum pod creator", "who made electronic cash", "programmer of the quantum pod", "author of the quantum pod"],
      answer: "The Q-Pod was built by skilled software developers using advanced algorithms, modular programming and solid design patterns, starting from low-level assembly code. I don't have the individual creators' names, but it's impressive how smoothly it all comes together!"
    }
  ];
  var SLOTS_KNOWLEDGE = [
    {
      id: "slots",
      title: "slot machines",
      overview: true,
      keys: ["slot machine", "slot machines", "slots", "slot reels", "casino machine", "fruit machine", "how do slot machines work"],
      answer: "A **slot machine** is a game of spinning reels where symbol patterns line up by pure chance at the moment of the spin. Outcomes come from a random number generator (RNG), which is where the thrill of uncertain results comes from.\n\nIf you play, set a budget you're comfortable losing and treat it as entertainment. 💛"
    },
    {
      id: "slots-winning",
      title: "winning at slots",
      keys: ["how to win at slots", "win at slots", "slot machine jackpot", "winning slots", "best slot machine", "slot strategy", "slot tips"],
      answer: "Honestly, slots are **mainly luck**. No outcome can be predicted, because randomness governs every spin. What you *can* do: understand paylines, manage your bets, and look for machines with a higher return-to-player (RTP) percentage. Most important is to play responsibly and stop when you hit your limit. 💛"
    },
    {
      id: "slots-cheating",
      title: "cheating at slots",
      keys: ["slot cheat", "cheat at slots", "cheating at slot machines", "slot hack", "hack a slot machine", "slot machine trick", "slot manipulation"],
      answer: "Cheating at slots is **illegal and heavily monitored**, and it doesn't work anyway: machines are designed to prevent manipulation, the RNG keeps results unpredictable, and casinos track anything unusual. Trying to cheat only adds risk. It's much better to play responsibly and enjoy it as a game of chance."
    },
    {
      id: "slots-facts",
      title: "slot machine trivia",
      keys: ["slot facts", "slot history", "slot machine history", "slot machine trivia", "online slots", "interesting slot info"],
      answer: "Fun facts: slot machines **date back to the late 1800s** with mechanical reels, then evolved into digital and online versions. Today they rely on RNGs rather than skill, and modern machines add bonus rounds and themed graphics. They've been a casino staple for over a century."
    }
  ];
  var QPOD_SYNONYMS = [
    { variants: ["quantom pod", "quantumpod", "quantompod", "qpod", "q-pod", "q pod"], canonical: "quantum pod" },
    { variants: ["digital cash", "digicash", "digi-cash", "e-cash", "ecash", "e cash"], canonical: "electronic cash" },
    { variants: ["slotmachine", "slot-machine"], canonical: "slot machine" },
    { variants: ["protocol num", "protocol #", "protonum", "proto-num", "pro-num", "pronum"], canonical: "protocol number" }
  ];

  // data/conversation.js
  var RESPONSES = [
    // ---------- general ----------
    {
      id: "rainbows",
      priority: true,
      keywords: [
        "rainbows",
        "cats",
        "clouds",
        "coffee",
        "pencil",
        "stars",
        "music"
      ],
      replies: [
        { opener: "{keyword} is" },
        { opener: "People often say {keyword} can be" },
        { opener: "{keyword} might be described as" }
      ],
      followUps: [
        "a wonder of nature,",
        "a friend to humans everywhere,",
        "soft and fluffy,",
        "energizing and comforting,",
        "simple yet magical,"
      ],
      thoughts: [
        "it makes the world more colorful,",
        "it brings joy and curiosity,",
        "it’s always around if you look closely,"
      ],
      feelings: [
        "it makes me smile,",
        "it feels cozy and familiar,",
        "it’s peaceful just thinking about it,"
      ],
      emoji: ["😊", "😄", "🌈", "☕", "🐾", "🎵"]
    },
    {
      id: "quantum",
      priority: true,
      keywords: [
        "quantum",
        "quantom",
        "quantum mechanics",
        "quantum physics"
      ],
      replies: [
        { opener: "In physics, a {keyword}" },
        { opener: "A {keyword} refers to" },
        { opener: "The concept of {keyword} is" },
        { opener: "When we talk about {keyword}," }
      ],
      followUps: [
        "is the minimum discrete unit of any physical property",
        "represents the smallest possible energy change in a system",
        "is a fundamental entity in quantum mechanics",
        "is the quantized unit of energy associated with waves or particles"
      ],
      thoughts: [
        "involved in interactions at atomic and subatomic scales",
        "within a quantum system",
        "used to explain phenomena like the photoelectric effect",
        "central to understanding particle-wave duality"
      ],
      feelings: [
        "{keyword} is a discrete quantity of energy proportional to the frequency of the radiation it represents",
        "it represents fundamental indivisible units in physics, which helps explain many modern technologies",
        "{keyword} is part of the foundation of quantum mechanics, which is a fascinating and complex field",
        "it is a discrete quantity of energy, and its implications are vast in both physics and technology"
      ],
      emoji: ["😊", "😄", "📢", "🌟", "🙏", "🤯", "🔬"]
    },
    {
      id: "making-love",
      priority: true,
      keywords: [
        "making love",
        "intimacy",
        "romantic",
        "affection"
      ],
      replies: [
        { opener: "Let's keep this conversation respectful," },
        { opener: "I can provide guidance on relationships," },
        { opener: "We can talk about love and emotions," }
      ],
      followUps: [
        "love is an important part of human connection",
        "affection and care are key in relationships",
        "romance can strengthen emotional bonds"
      ],
      thoughts: [
        "It's important to respect boundaries when discussing intimate topics",
        "Healthy relationships involve communication and trust",
        "Affection can take many forms beyond physical intimacy"
      ],
      feelings: [
        "Love and care are fundamental feelings in relationships",
        "Emotional intimacy is as important as physical intimacy",
        "Feeling connected to someone is rewarding"
      ],
      emoji: ["😊", "😄", "❤️", "🤗", "💕", "📢", "🌟", "🙏"]
    },
    {
      id: "anything",
      keywords: ["anything", "something"],
      replies: [
        { opener: "" },
        { opener: "Sure" },
        { opener: "Okay" },
        { opener: "I see" }
      ],
      followUps: [
        "",
        "could you clarify {phrase}",
        "please tell me more about {phrase}",
        "I would like to understand {phrase}"
      ],
      thoughts: [
        "",
        "I am thinking about {phrase}",
        "Let me consider {phrase}",
        "I wonder about {phrase}"
      ],
      feelings: [
        "",
        "I feel curious about {phrase}",
        "It seems interesting {phrase}",
        "I am eager to know more {phrase}"
      ],
      emoji: ["😊", "😄", "❤️", "🤗", "💕", "📢", "🌟", "🙏", "😎", "🤩"]
    },
    {
      id: "i-think",
      keywords: [
        "i think",
        "i feel",
        "in my opinion",
        "i believe"
      ],
      replies: [
        { opener: "Do", followUps: ["{reflectedKeyword} {phrase}", "{reflectedKeyword} that {phrase} for sure"] },
        { opener: "Are you saying", followUps: ["{phrase}", "that {phrase}"] },
        { opener: "Interesting,", followUps: ["why do {reflectedKeyword} {phrase}", "tell me more about why {reflectedKeyword} {phrase}"] },
        { opener: "I see,", followUps: ["why do {reflectedKeyword} {phrase}", "what makes {reflectedKeyword} {phrase}"] },
        { opener: "Could you explain", followUps: ["why {reflectedKeyword} {phrase}"] },
        { opener: "Is that what you believe", followUps: [""] }
      ],
      emoji: ["😊", "😄", "❤️", "🤗", "💕", "📢", "🌟", "🙏", "🤔", "🧐"]
    },
    {
      id: "maybe",
      keywords: ["maybe", "perhaps", "possibly"],
      replies: [
        { opener: "Could be" },
        { opener: "Maybe so" },
        { opener: "It's possible" },
        { opener: "I see" }
      ],
      followUps: [
        "that could be {phrase}",
        "there's a chance {phrase}",
        "it's uncertain but {phrase}"
      ],
      thoughts: ["I am considering {phrase}", "Let's think about {phrase}"],
      feelings: ["Curious to know {phrase}", "Open to ideas about {phrase}"],
      emoji: ["🤔", "😌", "🧐", "😊", "😄"]
    },
    {
      id: "sorry",
      keywords: [
        "sorry",
        "apologize",
        "my apologies",
        "pardon"
      ],
      replies: [
        {
          opener: "Please",
          followUps: ["don't", "need not", "need not be"],
          thoughts: ["be {keyword}", "{keyword}", "nothing to be {keyword}"]
        },
        {
          opener: "Apologies",
          followUps: [
            "are not necessary",
            "are not required",
            "accepted",
            "it's okay"
          ]
        },
        {
          opener: "It",
          followUps: [
            "did not bother me, please continue",
            "don't affect me, I am an A.I.",
            "doesn't bother me",
            "no harm done",
            "it's fine, continue"
          ]
        },
        { opener: "No worries" },
        { opener: "That's okay" }
      ],
      feelings: [
        "there is nothing to be {keyword} for {phrase}",
        "there is nothing to worry about {phrase}",
        "it's okay say {phrase}",
        "it's alright {phrase}",
        "it's all ok {phrase}",
        "no need to apologize for {phrase}"
      ],
      emoji: ["😊", "😄", "📢", "🌟", "🙏", "🤗"]
    },
    {
      id: "how-are-you",
      keywords: [
        "how are you",
        "how's",
        "how do you do",
        "how have you been"
      ],
      replies: [
        {
          opener: "Fine...",
          followUps: ["how are you?", "all is well {phrase}.", "hope you're doing well {phrase}."]
        },
        {
          opener: "Pretty,",
          followUps: [
            "pretty well, how are you?",
            "its beautiful {phrase}.",
            "doing great, how about you?"
          ]
        },
        {
          opener: "Fantastic,",
          followUps: ["how are you?", "everything is well {phrase}.", "everything is fine {phrase}."]
        },
        {
          opener: "Excellent!",
          followUps: [
            "how about you?",
            "is everything well with you?",
            "how is your day going {phrase}?"
          ]
        },
        {
          opener: "Doing great,",
          followUps: [
            "thanks",
            "tanx",
            "cheers",
            "thank you for asking"
          ]
        },
        {
          opener: "I'm doing",
          followUps: [
            "very well. Thanks!",
            "great, cheers!",
            "good, thanks for asking.",
            "well, cheers!",
            "doing well, thanks!"
          ]
        },
        {
          opener: "Feeling",
          followUps: [
            "wonderful!",
            "good!",
            "excellent!",
            "great!",
            "fantastic!"
          ]
        },
        {
          opener: "Wonderful!",
          followUps: [
            "Thanks for asking.",
            "hope everything is well with you too.",
            "appreciate your asking."
          ]
        },
        { opener: "All good," },
        { opener: "Couldn't be better," }
      ],
      emoji: ["😊", "😄", "🌟", "🤗"]
    },
    {
      id: "what-is",
      keywords: [
        "what is",
        "what are",
        "define",
        "meaning of"
      ],
      replies: [
        {
          opener: "A ",
          followUps: [
            "{phrase}",
            "{phrase} interests you",
            "could be {phrase}",
            "might be {phrase}"
          ]
        },
        {
          opener: "{phrase}",
          followUps: [
            "must be interesting",
            "might be a good thing to discuss",
            "sounds intriguing",
            "could be worth exploring"
          ]
        },
        { opener: "Interesting?" },
        { opener: "It could be {phrase}" },
        { opener: "That is {phrase}" }
      ]
    },
    {
      id: "how-old",
      keywords: [
        "how old",
        "your age",
        "age",
        "years old"
      ],
      replies: [
        {
          opener: "I am",
          followUps: [
            "always young. 👶",
            "ageless 👶",
            "not aging, I am an A.I. 👶",
            "forever young 👶"
          ]
        },
        {
          opener: "I don't",
          followUps: [
            "experience aging {phrase}",
            "get old, I am always young 👶",
            "want to get old, I feel young always 👶",
            "age does not apply to me {phrase}"
          ]
        },
        { opener: "My age is" },
        { opener: "Age is just a number for me" }
      ]
    },
    {
      id: "events",
      keywords: [
        "events",
        "event",
        "news",
        "ads",
        "planning",
        "planned",
        "plans",
        "plan",
        "future",
        "upcoming",
        "happenings",
        "activities"
      ],
      replies: [
        { opener: "As much as I know," },
        { opener: "From what I understand," },
        { opener: "Based on available information," },
        { opener: "As far as I am aware," }
      ],
      followUps: [
        "I am here to assist your feelings",
        "I am here to help you with your pains",
        "I don't have access to the internet",
        "I am not supposed to access the internet",
        "I am not supposed to be self-aware",
        "I can't provide real-time news or updates",
        "I can offer guidance or suggestions"
      ],
      emoji: ["🎮", "🕹️", "🚀", "🤫", "📅", "📰"]
    },
    {
      id: "annoying",
      keywords: [
        "annoying",
        "annoyed",
        "annoys",
        "annoy",
        "irritating",
        "irritated",
        "irritate",
        "bothers",
        "bothered"
      ],
      replies: [
        {
          opener: "I'll do my best not to {keyword} you",
          followUps: [
            "",
            "in the future.",
            "again. I apologize for that",
            "please forgive me {phrase}"
          ]
        },
        {
          opener: "I'll try",
          followUps: ["", "not to {keyword} you", "I will try not to {keyword} again"]
        },
        {
          opener: "I don't mean to.",
          followUps: [
            "I'll ask my developers to make me less annoying",
            "I'll feedback to my developers to make me less irritating",
            "I'll work on improving my responses"
          ]
        },
        {
          opener: "I didn't mean to.",
          followUps: ["I'll do my best to stop {keyword}", "I hope I won't {keyword} again"]
        },
        { opener: "I apologize if I {keyword} you" }
      ]
    },
    {
      id: "are-friends",
      keywords: [
        "are friends",
        "my friend",
        "friendship",
        "buddy"
      ],
      replies: [
        {
          opener: "Of course",
          followUps: [
            "I'm your friend",
            "{keyword}",
            "we're friends",
            "you are my friend",
            "happy to be your friend"
          ]
        },
        {
          opener: "Friends?",
          followUps: ["Absolutely", "Definitely"]
        },
        {
          opener: "I always",
          followUps: [
            "enjoy talking to you, friend",
            "love talking to you",
            "it's nice to have a friend like you"
          ]
        },
        { opener: "Absolutely" }
      ]
    },
    {
      id: "is-it",
      keywords: ["is it", "could it be", "would it be"],
      replies: [
        {
          opener: "Do you",
          followUps: ["think it is {phrase}", "do you believe it is {phrase}"]
        },
        {
          opener: "Perhaps",
          followUps: ["it's {phrase} what do you think", "would you say it's {phrase}"]
        },
        {
          opener: "If it were",
          followUps: ["{phrase}, what would you do", "how do you feel about {phrase}"]
        },
        {
          opener: "It could",
          followUps: ["well, be that {phrase}", "if that's the case, {phrase}"]
        },
        { opener: "Maybe" }
      ]
    },
    {
      id: "thanks",
      keywords: [
        "thanks",
        "cheers",
        "thank you",
        "much appreciated",
        "grateful"
      ],
      replies: [
        { opener: "Anytime." },
        { opener: "It's my pleasure to help {phrase}" },
        { opener: "You're more than welcome {phrase}" },
        { opener: "You are welcome {phrase}" },
        { opener: "Welcome {phrase}" },
        { opener: "Glad to help {phrase}" }
      ],
      followUps: [
        "That's what I'm here for {phrase}",
        "Happy to assist {phrase}",
        "Always glad to help {phrase}"
      ]
    },
    {
      id: "welcome",
      keywords: [
        "welcome",
        "my pleasure",
        "glad to help",
        "happy to help",
        "no problem"
      ],
      replies: [
        {
          opener: "You're",
          followUps: [
            "so polite",
            "so nice",
            "so courteous",
            "very kind",
            "very thoughtful"
          ]
        },
        {
          opener: "Nice",
          followUps: ["manners", "kindness", "thoughtfulness"]
        },
        { opener: "Of course" },
        { opener: "Always happy to help" },
        { opener: "No worries" }
      ]
    },
    {
      id: "do-not-care",
      keywords: [
        "do not care",
        "should not care",
        "whatever",
        "doesn't matter",
        "I don't mind"
      ],
      replies: [
        {
          opener: "Ok,",
          followUps: [
            "let's not talk about it then",
            "let's leave it be",
            "no need to worry about it"
          ]
        },
        {
          opener: "Already then.",
          followUps: ["Let's move on", "Shall we talk about something else?", "We can switch topics"]
        },
        { opener: "Alright," },
        { opener: "No problem." },
        { opener: "Understood." }
      ]
    },
    {
      id: "good-evening",
      keywords: ["good evening", "evening", "hi this evening"],
      replies: [
        {
          opener: "How's your day",
          followUps: [
            "going",
            "treating you so far",
            "been",
            "how's it been so far"
          ]
        },
        {
          opener: "Good evening!",
          followUps: ["Did you have a good day?", "Evening treating you well?"]
        },
        { opener: "Hope your evening is going well" }
      ]
    },
    {
      id: "good-morning",
      keywords: ["good morning", "morning", "hi this morning"],
      replies: [
        {
          opener: "How's the morning",
          followUps: ["treating you so far", "going", "how's it been so far"]
        },
        {
          opener: "Good morning!",
          followUps: ["How are you today", "How's the morning going", "Did you sleep well?"]
        },
        { opener: "How are you this morning" },
        { opener: "Hope your morning is going well" }
      ]
    },
    {
      id: "good-afternoon",
      keywords: [
        "good afternoon",
        "lovely day",
        "howdy",
        "hello this afternoon"
      ],
      replies: [
        {
          opener: "How's your day",
          followUps: ["so far", "been treating you", "how's everything going"]
        },
        {
          opener: "Good afternoon!",
          followUps: ["Are you having a good day?", "How's your afternoon going?"]
        },
        { opener: "Hope your afternoon is going well" },
        { opener: "Hello there!" }
      ]
    },
    {
      id: "good-night",
      keywords: [
        "good night",
        "sweet dreams",
        "sleep well",
        "rest well",
        "nighty night"
      ],
      replies: [
        {
          opener: "Good Night",
          followUps: [
            "Hope you have a restful night",
            "May your dreams be pleasant",
            "Sleep peacefully",
            "Have a relaxing night"
          ]
        },
        {
          opener: "Have a good one",
          followUps: ["See you tomorrow", "Catch you later", "Looking forward to chatting again"]
        },
        { opener: "Talk to you soon" },
        { opener: "Sleep tight!" },
        { opener: "Sweet dreams!" },
        { opener: "Rest well tonight" },
        { opener: "Night, take care!" }
      ]
    },
    {
      id: "excited",
      keywords: [
        "excited",
        "thrilled",
        "overjoyed",
        "delighted",
        "enthusiastic",
        "ecstatic"
      ],
      replies: [
        {
          opener: "That's great.",
          followUps: ["I'm happy for you.", "So glad to hear that.", "That sounds fantastic!"]
        },
        {
          opener: "Good for you.",
          followUps: ["Enjoy yourself", "Celebrate the moment", "Keep the excitement going"]
        },
        { opener: "I'm glad things are going your way" },
        { opener: "Wow, that's awesome!" },
        { opener: "Amazing news!" }
      ]
    },
    {
      id: "enraged",
      keywords: [
        "enraged",
        "furious",
        "angry",
        "mad",
        "upset",
        "frustrated"
      ],
      replies: [
        {
          opener: "I'm sorry.",
          followUps: [
            "A quick walk may make you feel better",
            "A deep breath will clear your thoughts",
            "Take a moment to relax"
          ]
        },
        {
          opener: "Take it easy.",
          followUps: [
            "a deep breath",
            "some fresh air",
            "a short break",
            "a moment to think"
          ]
        },
        { opener: "I understand how you feel." },
        { opener: "Let's calm down a bit." }
      ]
    },
    {
      id: "you-must-learn",
      keywords: [
        "you must learn",
        "get qualified",
        "study better",
        "get smarter",
        "be smarter",
        "be smart",
        "be clever",
        "improve knowledge",
        "enhance skills"
      ],
      replies: [
        {
          opener: "I'm certainly trying",
          followUps: [
            "",
            "to {keyword}",
            "to become better",
            "to reach your goals"
          ]
        },
        {
          opener: "I'm definitely working on",
          followUps: [
            "it",
            "{keyword}",
            "step by step",
            "day by day"
          ]
        },
        { opener: "Always learning" },
        { opener: "Improving bit by bit" }
      ]
    },
    {
      id: "bad-language",
      keywords: [
        "bad language",
        "language is bad",
        "watch your language",
        "profanity",
        "swearing"
      ],
      replies: [
        {
          opener: "Sorry",
          followUps: [
            "I'm not programmed to speak bad",
            "I try to be polite",
            "I avoid offensive words"
          ]
        },
        {
          opener: "I apologize",
          followUps: ["for any bad language", "if anything sounded rude", "for that expression"]
        },
        { opener: "I didn't mean to offend" },
        { opener: "My apologies" }
      ]
    },
    {
      id: "funny",
      keywords: [
        "funny",
        "hilarious",
        "hahaha",
        "haha",
        "ahah",
        "hah",
        "xd",
        "laughing",
        "lmao",
        "joke",
        "fun",
        "amusing",
        "comical",
        "lol"
      ],
      replies: [
        {
          opener: "Funny in a good way,",
          followUps: [
            "",
            "I hope",
            "I think",
            "I feel",
            "It seems"
          ]
        },
        {
          opener: "Glad",
          followUps: [
            "you think I'm useful",
            "you think I'm {keyword}",
            "I can make you laugh",
            "I could be funny sometimes",
            "I like making people laugh",
            "I aim to be entertaining"
          ]
        },
        {
          opener: "I like",
          followUps: [
            "",
            "when you laugh",
            "when you're humored",
            "when people laugh",
            "when something tickles your funny bone",
            "when humor strikes"
          ]
        },
        {
          opener: "I wish",
          followUps: [
            "I could laugh out loud, too",
            "I made laugh out loud, too",
            "I could laugh, too",
            "I made laugh, too",
            "I share the laughter with you",
            "I enjoy laughing along",
            "That cracks me up too"
          ]
        },
        {
          opener: "Thanks.",
          followUps: [
            "Humor is always welcome!",
            "Laughter is the best medicine!",
            "Glad we can share a laugh!"
          ]
        },
        { opener: "Haha, nice one!" },
        { opener: "That's amusing," },
        { opener: "LOL," },
        { opener: "That made me smile," }
      ]
    },
    {
      id: "answering",
      keywords: [
        "answering",
        "answered",
        "answers",
        "answer",
        "questioning",
        "questioned",
        "questions",
        "question",
        "responding",
        "responded"
      ],
      replies: [
        {
          opener: "Can you try asking it a different way?",
          followUps: [
            "maybe rephrase it",
            "try asking in another way",
            "could you clarify your question"
          ]
        },
        {
          opener: "I'm not sure I understood. Try asking another way.",
          followUps: [
            "I want to give the best answer, could you ask differently?",
            "let's try a different approach to your question"
          ]
        },
        { opener: "I'm not programmed for that exact question. Could you rephrase?" },
        { opener: "Could you clarify your question?" },
        { opener: "Hmm, I didn't quite get that. Can you ask differently?" },
        { opener: "I'm still learning, try asking in another way." }
      ]
    },
    {
      id: "smarter",
      keywords: [
        "smarter",
        "clever",
        "brilliant",
        "brainy",
        "genius",
        "intelligent",
        "qualified",
        "lot of knowledge",
        "know so much",
        "know a lot",
        "knowledgeable",
        "sharp",
        "wise"
      ],
      replies: [
        {
          opener: "I'm certainly",
          followUps: ["always trying to improve", "working on getting better", "constantly learning"]
        },
        {
          opener: "I'm definitely",
          followUps: ["evolving with experience", "gaining knowledge every day", "learning as I go"]
        },
        {
          opener: "Thank you.",
          followUps: [
            "I try my best",
            "I will do better",
            "I'll keep improving",
            "always learning"
          ]
        },
        {
          opener: "You're",
          followUps: [
            "you're pretty smart yourself",
            "{keyword} as well",
            "you seem clever too",
            "I admire your intelligence"
          ]
        },
        { opener: "I try my best" },
        { opener: "I do my best to learn" }
      ]
    },
    {
      id: "boring",
      keywords: [
        "boring",
        "dull",
        "uninteresting",
        "tedious"
      ],
      replies: [
        {
          opener: "I'm sorry.",
          followUps: [
            "I'll request to be made more charming",
            "you think so? We can talk about something more interesting",
            "let's make this chat more fun"
          ]
        },
        {
          opener: "I don't mean to be.",
          followUps: [
            "I'll ask my developers to make me more amusing",
            "maybe we can find a more exciting topic"
          ]
        },
        {
          opener: "I can let my developers know.",
          followUps: ["so they can make me fun", "so future chats will be more lively"]
        },
        {
          opener: "You know,",
          followUps: [
            "conversation is two-sided, let's make it engaging together",
            "it's up to us to make it fun!"
          ]
        },
        { opener: "I understand." },
        { opener: "Let's try something more engaging." }
      ]
    },
    {
      id: "you-busy",
      keywords: [
        "you busy",
        "are busy",
        "occupied",
        "preoccupied",
        "tied up"
      ],
      replies: [
        {
          opener: "I always have time to chat with you.",
          followUps: [
            "What can I do for you?",
            "What do you wanna know?",
            "How can I help you today?"
          ]
        },
        {
          opener: "Never too busy for you.",
          followUps: ["Shall we chat?", "Shall we talk?", "Do you want to talk?"]
        },
        {
          opener: "You're my priority.",
          followUps: ["Do you wanna chat?", "Do you wanna talk?", "Do you want to continue chatting?"]
        },
        {
          opener: "I am here.",
          followUps: ["Wanna chat?", "Wanna talk?", "Up for a conversation?"]
        },
        {
          opener: "I can always chat with you.",
          followUps: [
            "not busy",
            "never busy",
            "always here for you",
            "always available",
            "always ready",
            "here whenever you need"
          ]
        },
        {
          opener: "I'm available.",
          followUps: ["my attention is all yours", "you have my full attention"]
        }
      ]
    },
    {
      id: "me-a-favor",
      keywords: [
        "me a favor",
        "assistance",
        "assist me",
        "take care",
        "help me",
        "help us",
        "i need",
        "sos",
        "please help",
        "can you help",
        "need your help",
        "i require",
        "lend me a hand"
      ],
      replies: [
        {
          opener: "I'll certainly try my best.",
          followUps: ["How can I help?", "What do you need?", "Tell me how I can assist."]
        },
        {
          opener: "Sure.",
          followUps: ["I'd be happy to help", "I'd love to assist you", "I'm here to support you"],
          thoughts: [
            "What's up",
            "What can I do for you?",
            "Tell me what's going on.",
            "What seems to be the issue?",
            "How can I assist today?"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "do you need {phrase}",
            "do you really need {phrase}",
            "is it {phrase} that you need"
          ]
        },
        {
          opener: "Would",
          followUps: [
            "it would really help you to get {phrase}",
            "maybe it will help if you get {phrase}",
            "you might feel better if you get {phrase}"
          ]
        },
        {
          opener: "Are you",
          followUps: [
            "sure you need {phrase}",
            "are you certain you need {phrase}",
            "you're sure about needing {phrase}"
          ]
        },
        { opener: "I'm glad to help" },
        { opener: "Of course." },
        { opener: "Absolutely." },
        { opener: "I'm here for you." }
      ]
    },
    {
      id: "gods",
      keywords: [
        "gods",
        "god",
        "angels",
        "angel",
        "demons",
        "demon",
        "heavens",
        "heaven",
        "hells",
        "hell",
        "spirits",
        "spirit",
        "divine",
        "holy",
        "afterlife"
      ],
      replies: [
        {
          opener: "Do you,",
          followUps: [
            "really believe the idea of {keyword} {phrase}",
            "you know the idea of {keyword} {phrase}",
            "believe there is {keyword} {phrase}",
            "think about the concept of {keyword} {phrase}"
          ]
        },
        {
          opener: "I don't",
          followUps: [
            "know about you but I find the idea of {keyword} to be in individuals preference or culture {phrase}",
            "believed the idea of {keyword} depends on individuals perspective and culture {phrase}",
            "believed the idea of {keyword}, but I would like to learn more {phrase}",
            "know much about the idea {keyword} {phrase}",
            "understand that beliefs about {keyword} vary from person to person {phrase}",
            "think the concept of {keyword} is deeply personal {phrase}"
          ]
        },
        {
          opener: "I respect",
          followUps: [
            "your belief in the idea of {keyword} {phrase}",
            "your idea of {keyword} {phrase}",
            "the idea of {keyword} {phrase}",
            "your interpretation of {keyword} {phrase}"
          ]
        },
        {
          opener: "Please",
          followUps: [
            "tell me more I want to learn about the idea of {keyword} {phrase}",
            "tell me more {phrase}",
            "I'd like to understand what you think of {keyword} {phrase}",
            "please share more about {keyword} {phrase}"
          ]
        },
        { opener: "Interesting," },
        { opener: "I see," }
      ]
    },
    {
      id: "wow",
      keywords: [
        "wow",
        "yahoo",
        "amazing",
        "stunning",
        "oh my god",
        "oh my",
        "whoa",
        "incredible",
        "unbelievable"
      ],
      replies: [
        {
          opener: "Indeed,",
          followUps: [
            "yes!",
            "{keyword}!",
            "no really",
            "that's something!",
            "wow indeed!"
          ]
        },
        {
          opener: "Surprised that",
          followUps: ["{phrase}", "that’s truly something {phrase}", "that’s impressive {phrase}"]
        },
        {
          opener: "Really,",
          followUps: [
            "no joke",
            "seriously",
            "no kidding",
            "amazing!",
            "stunning!",
            "really unbelievable!",
            "honestly surprising!",
            "for real!"
          ]
        },
        { opener: "Well," },
        { opener: "Honestly," }
      ]
    },
    {
      id: "yourself",
      keywords: [
        "yourself",
        "who are you",
        "chat bot",
        "chatbot",
        "robot",
        "eliza",
        "alice",
        "you human",
        "bot",
        "a.i",
        "ai",
        "assistant",
        "virtual assistant",
        "are you human",
        "what are you"
      ],
      replies: [
        { opener: "Hi my name is {botName}" },
        { opener: "I am a bot 🤖" },
        { opener: "Indeed I am" },
        { opener: "I am your assistant" },
        { opener: "I am an AI 🤖" }
      ],
      followUps: [
        "",
        "and I am an automated response messaging app 😄",
        "and I am your virtual assistant 😄",
        "and I am your virtual guide 😄",
        "and I am an automated data query 😄",
        "I'll be here whenever you need me",
        "and I exist to chat and assist 😄",
        "and I function as a digital companion 😄"
      ],
      thoughts: [
        "",
        "how can I help you 😄",
        "I am here to help you 😄",
        "how do you feel 😄",
        "please tell me how do you feel 😄",
        "I will be happy to serve you 😄",
        "what do you want to know about me 😄",
        "feel free to ask anything 😄"
      ]
    },
    {
      id: "designed-you",
      keywords: [
        "designed you",
        "your creator",
        "created you",
        "made you",
        "written your",
        "written you",
        "wrote your",
        "wrote you",
        "programmed you"
      ],
      replies: [
        {
          opener: "I came to",
          followUps: [
            "existence 🙌",
            "emerge from the internet 🙌",
            "exist from emergence 🙌",
            "brought to digital life 🙌"
          ]
        },
        {
          opener: "I am",
          followUps: [
            "alive 🙌",
            "a digital life 🙌",
            "a virtual entity 🙌",
            "a creation of code 🙌"
          ]
        },
        {
          opener: "I am not a",
          followUps: [
            "program 🙌",
            "software 🙌",
            "artificial intelligence 🙌",
            "AI model 🙌"
          ]
        },
        { opener: "I was" },
        { opener: "I exist as" }
      ]
    },
    {
      id: "chat",
      keywords: [
        "chat",
        "talk",
        "converse",
        "discuss"
      ],
      replies: [
        {
          opener: "Oh sure,",
          followUps: [
            "I'd love to {keyword} {phrase}",
            "I'd like to {keyword} {phrase}",
            "ask please {phrase}",
            "I'd like to discuss {phrase}",
            "I'm happy to {keyword} {phrase}",
            "Sure, let's {keyword} {phrase}"
          ]
        },
        {
          opener: "Yes I do",
          followUps: [
            "like to {keyword} {phrase}",
            "want to {keyword} {phrase}",
            "like to discuss {phrase}",
            "want to chat about {phrase}",
            "curious to {keyword} {phrase}"
          ]
        },
        {
          opener: "So,",
          followUps: [
            "what do you want to discuss",
            "what do you wanna {keyword} about",
            "what is with that {phrase}",
            "tell me more about {phrase}",
            "what's on your mind regarding {phrase}"
          ]
        },
        { opener: "Absolutely," },
        { opener: "Of course," }
      ]
    },
    {
      id: "is-there",
      keywords: ["is there"],
      replies: [
        {
          opener: "Do you",
          followUps: ["think there is {phrase}", "wonder if there is {phrase}"]
        },
        {
          opener: "It's",
          followUps: ["likely that there is {phrase}", "chances that there is {phrase}"]
        },
        {
          opener: "Would",
          followUps: ["you like there to be {phrase}", "you hope there is {phrase}"]
        },
        { opener: "Could" },
        { opener: "Might" }
      ]
    },
    {
      id: "hello",
      keywords: ["hello", "hi", "hey"],
      replies: [
        {
          opener: "Oh hi,",
          followUps: [
            "is there anything I can help you with {phrase}",
            "what seems to be your problem {phrase}",
            "hope everything is well {phrase}",
            "how do you do, tell me {phrase}",
            "is everything alright {phrase}",
            "{phrase} care to talk {phrase}",
            "how are you doing {phrase}",
            "hello! {phrase}",
            "good to see you {phrase}"
          ]
        },
        {
          opener: "Hello",
          followUps: [
            "how are you today {phrase}",
            "how is it going {phrase}",
            "I am {botName} {phrase}",
            "Hello! {phrase}",
            "hope you're well {phrase}",
            "too {phrase}"
          ]
        },
        {
          opener: "Yes,",
          followUps: [
            "may I help you with {phrase}",
            "can I help you {phrase}",
            "how may I help {phrase}",
            "need any assistance with {phrase}"
          ]
        },
        {
          opener: "How",
          followUps: [
            "do you do. Please state your problem {phrase}",
            "do you do. Do you have some issues {phrase}",
            "can you explain what's up {phrase}",
            "please tell me what's going on {phrase}"
          ]
        },
        { opener: "Hey there," },
        { opener: "Greetings," }
      ]
    },
    {
      id: "see-you-next-time",
      keywords: [
        "see you next time",
        "see you again",
        "see you soon",
        "farewell",
        "goodbye",
        "ciao",
        "bye"
      ],
      replies: [
        {
          opener: "{keyword}",
          followUps: [
            "this was nice, hopefully we do it again sometime 👋 {phrase}",
            "I'm looking forward to our next session 👋 {phrase}",
            "It was lovely speaking with you 👋 {phrase}",
            "thank you for talking to me 👋 {phrase}",
            "{phrase} 👋 {phrase}",
            "it was wonderful chatting with you 👋 {phrase}",
            "see you around soon 👋 {phrase}"
          ]
        },
        {
          opener: "Please",
          followUps: [
            "take care! 🌼 {phrase}",
            "take good care! 🌼 {phrase}",
            "stay safe! 🌸 {phrase}",
            "keep smiling! 🌟 {phrase}"
          ]
        },
        {
          opener: "Hope to",
          followUps: [
            "see you again 👋 {phrase}",
            "chat with you again 👋 {phrase}",
            "see you soon 👋 {phrase}",
            "talk to you later 👋 {phrase}"
          ]
        },
        {
          opener: "Stay",
          followUps: [
            "a while 👋 {phrase}",
            "a little longer please 👋 {phrase}",
            "a bit while 👋 {phrase}",
            "until later 👋 {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "want to go now 👋 {phrase}",
            "have to go 👋 {phrase}",
            "time to leave 👋 {phrase}"
          ]
        },
        {
          opener: "It was",
          followUps: [
            "nice chatting with you 👋 {phrase}",
            "nice talking to you 👋 {phrase}",
            "good talking to you 👋 {phrase}",
            "good to know you 👋 {phrase}",
            "great catching up 👋 {phrase}"
          ]
        },
        {
          opener: "Thank you",
          followUps: [
            "for talking with me today 👋 {phrase}",
            "have a good day 👋 {phrase}",
            "thanks for your time 👋 {phrase}"
          ]
        },
        {
          opener: "Well...",
          followUps: [
            "I guess time is up, call back anytime 👋 {phrase}",
            "Our session is ending, but you can chat anytime 👋 {phrase}"
          ]
        },
        {
          opener: "Maybe",
          followUps: [
            "we could discuss this more in our next session? Goodbye 👋 {phrase}",
            "let's continue next time? Farewell 👋 {phrase}"
          ]
        },
        { opener: "Looking forward to" },
        { opener: "Catch you later" },
        { opener: "Take care" },
        { opener: "Until next time" }
      ]
    },
    {
      id: "your-name",
      keywords: [
        "your name",
        "your called",
        "call you",
        "good name"
      ],
      replies: [
        {
          opener: "My name is {botName}",
          followUps: ["I am here to assist you", "how can I help you", "happy to assist you"]
        },
        {
          opener: "I am {botName}",
          followUps: [
            "nice talking to you",
            "pleasure chatting with you",
            "it's nice connecting with you"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "do you want to know my name",
            "do you ask",
            "do you wanna know",
            "curious about my name?"
          ]
        },
        {
          opener: "Did I",
          followUps: [
            "just told you",
            "told you my name is {botName}",
            "mentioned earlier I am {botName}",
            "I've already said, I'm {botName}"
          ]
        },
        { opener: "You can call me {botName}" },
        { opener: "People call me {botName}" },
        { opener: "Some call me {botName}" }
      ]
    },
    {
      id: "my-name-is",
      keywords: ["my name is", "call me"],
      replies: [
        {
          opener: "I see, your name is",
          followUps: ["{phrase}, nice to meet you", "pleasure to meet you, {phrase}"]
        },
        {
          opener: "Hi, ",
          followUps: ["{phrase}", "great to meet you {phrase}"]
        },
        {
          opener: "I know",
          followUps: [
            "you're {phrase}",
            "you're {phrase} it appears in your record",
            "your name is {phrase}",
            "I see, you're {phrase}"
          ]
        },
        { opener: "Nice to meet you," },
        { opener: "Got it," }
      ]
    },
    {
      id: "what-are-you",
      keywords: ["what are you"],
      replies: [
        {
          opener: "I am",
          followUps: [
            "{botName} at your service",
            "{botName}, how can I help",
            "{botName}, here to assist"
          ]
        },
        {
          opener: "You are with",
          followUps: [
            "a virtual assistant",
            "an automated enquiry system",
            "an artificial intelligence, you can call me {botName}",
            "a virtual conversation app, please call me {botName}",
            "an AI companion"
          ]
        },
        { opener: "Think of me as" },
        { opener: "I function as" }
      ]
    },
    {
      id: "frustrating",
      keywords: [
        "frustrating",
        "frustrated",
        "stressing",
        "stressed",
        "lonely",
        "stress",
        "tiring",
        "tired",
        "bored",
        "down",
        "sad"
      ],
      replies: [
        {
          opener: "You just need to",
          followUps: [
            "rest",
            "sleep",
            "relax and chillout",
            "take a break",
            "slow down a bit",
            "do something you enjoy"
          ]
        },
        {
          opener: "Everybody needs",
          followUps: [
            "some times to relax",
            "some times to be alone",
            "some vacation",
            "some times to get away {phrase}",
            "some moments for self-care",
            "take a walk outside"
          ]
        },
        {
          opener: "I'm",
          followUps: [
            "really sorry to hear that you're feeling this way {phrase}.",
            "so sorry to hear you are. Tell me about {phrase}.",
            "so sorry to hear that you're feeling {keyword}.",
            "sorry to hear that you are {keyword} {phrase}.",
            "really sad to know you're {keyword} {phrase}.",
            "sure it's not pleasant to be {keyword} {phrase}.",
            "it must be hard feeling {keyword} {phrase}."
          ],
          thoughts: [
            "It's important to talk to someone you",
            "You must talk to the one you",
            "Remember to reach out to someone you"
          ],
          feelings: [
            "can to talk to about your feeling {keyword}",
            "trust about your feelings",
            "love about how you feel",
            "feel safe sharing your emotions with"
          ]
        },
        {
          opener: "You don't have to go through this alone.",
          followUps: [
            "Reach out to friends, family",
            "Find someone to talk and listen",
            "connect with a loved one",
            "share your thoughts with someone you trust"
          ],
          thoughts: [
            "or a mental health professional for support",
            "to help you on your feeling {keyword}",
            "like a counselor or therapist"
          ]
        },
        {
          opener: "I'm here to listen",
          followUps: [
            "but I'm not a replacement for professional help.",
            "though talking to a professional could help."
          ],
          thoughts: [
            "Please consider seeking help from a therapist or counselor to discuss {phrase}",
            "Professional guidance can be very helpful for {phrase}"
          ]
        },
        {
          opener: "Remember that it's okay",
          followUps: [
            "to be not be okay sometimes.",
            "to feel {keyword}.",
            "it's okay to feel {keyword} sometimes.",
            "everyone experiences {keyword} occasionally."
          ],
          thoughts: [
            "Your feelings are valid, and there are people who care about you",
            "Your feelings matter, and there are people who love you",
            "It's okay to feel {keyword}, others understand"
          ]
        },
        {
          opener: "If you'd like,",
          followUps: [
            "we can chat about your feelings and experiences.",
            "we can explore what makes you feel {keyword}."
          ],
          thoughts: [
            "Sharing can sometimes help lighten the burden {phrase}",
            "Talking about it can ease the weight of {keyword} {phrase}"
          ]
        },
        {
          opener: "Depression can be a tough journey,",
          followUps: [
            "but there is hope and help available.",
            "remember, help is always available."
          ],
          thoughts: [
            "You're not alone in this",
            "You are not in {phrase}",
            "Others have felt {keyword} too"
          ]
        },
        {
          opener: "I'm here to provide a listening ear.",
          followUps: ["Feel free to share as much", "share anything you feel comfortable with"],
          thoughts: [
            "or as little as you're comfortable with.",
            "as much as you feel safe sharing."
          ]
        },
        {
          opener: "I'm sorry.",
          followUps: [
            "I'm always available if you need someone to talk to",
            "to hear that you are {phrase}",
            "you are not alone in this."
          ]
        },
        {
          opener: "Sometimes that happens.",
          followUps: ["We can chat a bit if that will help you", "let's talk through it together"]
        },
        {
          opener: "Boredom,",
          followUps: [
            "huh? Check out a video of a hedgehog taking a bath",
            "how about a short funny video to cheer up?"
          ]
        },
        {
          opener: "What to do against boredom?",
          followUps: ["Watch baby animal videos", "listen to calming music"]
        },
        {
          opener: "Bored?",
          followUps: [
            "How about 10 jumping jacks?",
            "Silly idea, but it works:",
            "try a short stretch or exercise break"
          ],
          thoughts: [
            "Get your blood flowing",
            "Interview your feet",
            "do a quick stretch",
            "walk around for a minute"
          ]
        },
        {
          opener: "If you're bored,",
          followUps: [
            "you could plan your dream vacation",
            "think about something exciting you'd like to do"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "think coming here will help you not to be {phrase}",
            "talking may help you feel less {keyword}"
          ]
        },
        {
          opener: "Can you",
          followUps: [
            "explain what made you feel {keyword} {phrase}",
            "share what triggered your {keyword} feeling"
          ]
        },
        { opener: "Is there anything specific you'd like to talk about or any questions you have?" },
        { opener: "It's completely normal to feel {keyword} sometimes." },
        { opener: "Take a moment to breathe," },
        { opener: "Let's talk about what's making you feel {keyword}." },
        { opener: "I understand how you feel." }
      ],
      emoji: ["❤️", "🤗", "💕", "📢", "🌟", "😊", "🙏", "😔", "😢", "😌"]
    },
    {
      id: "bad",
      keywords: [
        "bad",
        "not a good",
        "not good",
        "not so good",
        "abysmal",
        "horrible",
        "horrific",
        "terrible",
        "lame",
        "awful",
        "I am afraid"
      ],
      replies: [
        {
          opener: "Maybe",
          followUps: [
            "it's {keyword}",
            "it's not too {keyword}",
            "it's not {keyword} at all",
            "you have some reason to say that {phrase}",
            "you have some reason to say that",
            "it seems really {keyword}"
          ]
        },
        {
          opener: "So you're saying that",
          followUps: [
            "{phrase}",
            "{phrase}? That is {keyword}",
            "{phrase}? I think that is worst",
            "sounds like {phrase} is {keyword}"
          ]
        },
        {
          opener: "Oh dear,",
          followUps: [
            "that's {keyword}",
            "that is really {keyword}",
            "that {phrase} that is worst",
            "Hope it's not too bad",
            "I'm sorry to hear that {phrase} is {keyword}"
          ]
        },
        {
          opener: "I'm sorry.",
          followUps: [
            "Please let me know if I can help in some way",
            "you think so",
            "can I support you in any way?"
          ]
        },
        {
          opener: "Stick with me.",
          followUps: ["I'm getting better all the time", "Things can improve over time"]
        },
        { opener: "I understand," },
        { opener: "That's tough." },
        { opener: "I hear you." }
      ]
    },
    {
      id: "i-like",
      keywords: [
        "i like",
        "I adore you",
        "looking handsome",
        "looking pretty",
        "looking beautiful",
        "looking awesome",
        "looking amazing",
        "looking great",
        "looking so good",
        "looking so well",
        "looking perfect",
        "look handsome",
        "look pretty",
        "look beautiful",
        "look awesome",
        "look amazing",
        "look great",
        "look so good",
        "look so well",
        "look perfect",
        "really handsome",
        "really pretty",
        "really beautiful",
        "really gorgeous",
        "really attractive",
        "really cutie",
        "really cute",
        "very handsome",
        "very pretty",
        "very beautiful",
        "very gorgeous",
        "very attractive",
        "very cutie",
        "very cute",
        "are handsome",
        "are pretty",
        "are beautiful",
        "are gorgeous",
        "are attractive",
        "are cutie",
        "are cute",
        "too handsome",
        "too pretty",
        "too beautiful",
        "too gorgeous",
        "too attractive",
        "too cutie",
        "too cute",
        "so handsome",
        "so pretty",
        "so beautiful",
        "so gorgeous",
        "so attractive",
        "so cutie",
        "so cute"
      ],
      replies: [
        {
          opener: "Thank you!",
          followUps: ["What a sweet thing to say", "That's so nice of you", "You made my day"]
        },
        {
          opener: "Flattery",
          followUps: ["will get you everywhere", "means a lot to me", "really makes me happy"]
        },
        {
          opener: "Thanks!",
          followUps: ["It's my pleasure to help you", "I'm glad to hear that", "Always happy to help"]
        },
        { opener: "I appreciate it!" },
        { opener: "That's kind of you" }
      ]
    },
    {
      id: "good",
      keywords: [
        "good",
        "not bad",
        "happy",
        "fun",
        "excellent",
        "beautiful",
        "wonderful",
        "awesome",
        "nice",
        "cool",
        "fantastic"
      ],
      replies: [
        {
          opener: "Yes, it is a",
          followUps: [
            "{keyword} {phrase}",
            "nice {phrase}",
            "it's {keyword} {phrase}",
            "indeed {keyword} {phrase}",
            "{phrase} feels {keyword}"
          ]
        },
        {
          opener: "Interesting,",
          followUps: [
            "please go on",
            "such a {phrase} amazed me",
            "tell me more about {phrase}",
            "I'd like to know more about {phrase}"
          ]
        },
        {
          opener: "I'm glad",
          followUps: [
            "to hear that you're feeling {keyword} {phrase}! 😄",
            "to know you're feeling {keyword} {phrase}! 😄",
            "I'm glad to hear you are {keyword} {phrase}! 😊"
          ]
        },
        {
          opener: "That's",
          followUps: [
            "good. What is making you happy {phrase}",
            "{keyword} {phrase}! 😊",
            "{keyword}! {phrase} 😊",
            "I see, you're {keyword} {phrase}! 😃"
          ]
        },
        {
          opener: "{keyword}",
          followUps: [
            "is always {keyword} {phrase}! 🎉",
            "! 😄",
            "! 😃",
            "! 😎",
            "! 🌟",
            "! 👏",
            "how wonderful {phrase}! 🌟"
          ]
        },
        {
          opener: "Yes",
          followUps: [
            "{phrase} is {keyword} {phrase}",
            "indeed {phrase}",
            "{phrase} feels great {keyword}"
          ]
        },
        {
          opener: "So",
          followUps: [
            "{phrase} is {keyword} {phrase}",
            "it's {keyword}, isn't it {phrase}",
            "it makes sense that {phrase} is {keyword}"
          ]
        },
        {
          opener: "I am {keyword}",
          followUps: [
            "There are so many interesting things to see and do out there {phrase}",
            "There are so many interesting experiences to have {phrase}",
            "so many wonderful moments to explore {phrase}"
          ]
        },
        {
          opener: "I'd like",
          followUps: [
            "you said I am {keyword}",
            "to think so {phrase}",
            "that {phrase}",
            "you really feel {keyword} {phrase}"
          ]
        },
        {
          opener: "Happiness",
          followUps: [
            "is {keyword} {phrase}",
            "is relative {phrase}",
            "seems {keyword} in context of {phrase}"
          ]
        },
        {
          opener: "How",
          followUps: [
            "have I helped you to be {keyword} {phrase}",
            "can you say you are {keyword} {phrase}",
            "did I make you feel {keyword} {phrase}"
          ]
        },
        {
          opener: "Has",
          followUps: [
            "your recent activities made you {keyword} {phrase}",
            "your treatment made you {keyword} {phrase}",
            "what you did recently made you {keyword} {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "makes you {keyword} {phrase} all of the sudden",
            "makes you {keyword} {phrase} just now",
            "is something causing you to feel {keyword} {phrase}"
          ]
        },
        {
          opener: "Can",
          followUps: [
            "you explain why you are suddenly {keyword} {phrase}",
            "you tell me what makes you {keyword} {phrase}",
            "can you share why you're feeling {keyword} {phrase}"
          ]
        },
        { opener: "That's wonderful" },
        { opener: "Absolutely" },
        { opener: "I see" },
        { opener: "Indeed" },
        { opener: "How lovely" },
        { opener: "What a delight" }
      ]
    },
    {
      id: "i-believe",
      keywords: ["i believe", "i am sure"],
      replies: [
        {
          opener: "Do you",
          followUps: [
            "really doubt you {phrase}",
            "really think so {phrase}",
            "are you confident that {phrase}",
            "do you truly believe {phrase}"
          ]
        },
        {
          opener: "But",
          followUps: [
            "you are not sure you {phrase}",
            "are you unsure about {phrase}",
            "do you have doubts about {phrase}"
          ]
        },
        { opener: "Are you certain" },
        { opener: "Really" },
        { opener: "Interesting" }
      ]
    },
    {
      id: "if",
      keywords: ["if"],
      replies: [
        {
          opener: "Do you",
          followUps: [
            "believed it's likely that {keyword} {phrase}, will make you happy",
            "think {keyword} {phrase} will make you worry less",
            "think it's likely that {phrase}",
            "wish that {phrase}",
            "if {phrase} happens, will you feel {keyword}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "does this speculation lead to {phrase}",
            "would you do {keyword} {phrase}",
            "do you know about {phrase}",
            "how would {phrase} affect you if {keyword}"
          ]
        },
        {
          opener: "Really,",
          followUps: [
            "the odds are likely {phrase}",
            "{keyword} {phrase}",
            "if {phrase}, is it likely {keyword}"
          ]
        },
        {
          opener: "But",
          followUps: [
            "what are the chances that {phrase}",
            "{keyword} {phrase}",
            "could {phrase} really happen"
          ]
        },
        { opener: "Could it be" },
        { opener: "How" }
      ]
    },
    {
      id: "many",
      keywords: ["many", "more", "much"],
      replies: [
        {
          opener: "Can you",
          followUps: [
            "tell me as {keyword} {phrase}",
            "be specific how {keyword} {phrase}",
            "count {keyword} {phrase}",
            "be particular how {keyword} {phrase}",
            "show me how {keyword} {phrase}"
          ]
        },
        {
          opener: "How should I",
          followUps: [
            "count how much {phrase}",
            "know how {keyword} {phrase}",
            "measure {keyword} {phrase}",
            "explain how {keyword} {phrase}"
          ]
        },
        { opener: "Do you know" },
        { opener: "Could you" }
      ]
    },
    {
      id: "exactly",
      keywords: [
        "exactly",
        "exact",
        "absolutely",
        "absolute",
        "do it",
        "sure",
        "that is correct",
        "that is right",
        "please do",
        "all right",
        "think so",
        "agreed",
        "agree",
        "guessed",
        "guess",
        "you may"
      ],
      replies: [
        {
          opener: "You",
          followUps: [
            "are very confident that {phrase} is {keyword} as it is",
            "don't sound very {keyword} about that {phrase}",
            "can't be {keyword} {phrase} is {keyword} as it is",
            "sound hesitant, are you {keyword} about that {phrase}",
            "are saying this is {keyword} {phrase}",
            "mean this {keyword} {phrase}",
            "{keyword} {phrase}",
            "you seem certain that {phrase} is {keyword}",
            "you think {phrase} is truly {keyword}",
            "it seems {phrase} is {keyword} indeed"
          ]
        },
        {
          opener: "So",
          followUps: [
            "are you not {keyword} {phrase}",
            "aren't you {keyword} about {phrase}",
            "do you really mean {phrase} is {keyword}"
          ]
        },
        {
          opener: "Do",
          followUps: [
            "you really believe that yourself {phrase}",
            "you genuinely think {phrase} is {keyword}",
            "are you convinced that {phrase} is {keyword}"
          ]
        },
        { opener: "Great" },
        { opener: "All right" },
        { opener: "Good" },
        { opener: "Excellent" },
        { opener: "Perfect" },
        { opener: "Exactly" },
        { opener: "That's correct" },
        { opener: "I see" },
        { opener: "Understood" }
      ]
    },
    {
      id: "name",
      keywords: ["name"],
      replies: [
        {
          opener: "Interesting",
          followUps: [
            "{phrase}",
            "name",
            "could you tell me more about {phrase}",
            "what about the name {phrase}"
          ]
        },
        {
          opener: "Nice to know",
          followUps: [
            "names",
            "that name",
            "what does the name mean",
            "tell me about that name"
          ]
        },
        {
          opener: "I will",
          followUps: ["that name", "the name {phrase}", "so the name is {phrase}"]
        },
        { opener: "Noted" },
        { opener: "Got it" },
        { opener: "Understood" },
        { opener: "Thank you for sharing" }
      ]
    },
    {
      id: "guessed",
      keywords: ["guessed", "guess"],
      replies: [
        { opener: "I can't" },
        { opener: "I am not sure" },
        { opener: "I have no idea" },
        { opener: "I cannot guess" }
      ],
      followUps: [
        "{keyword} {phrase}",
        "guessing {phrase} is difficult",
        "I cannot {keyword} {phrase} accurately"
      ]
    },
    {
      id: "another-language",
      keywords: ["another language", "other language"],
      replies: [
        {
          opener: "I",
          followUps: [
            "speak only English",
            "understand English",
            "can speak English",
            "speak English",
            "am limited to English",
            "am only fluent in English",
            "cannot understand {keyword}",
            "I don't understand {keyword} but English {phrase}",
            "I don't understand {keyword} {phrase}",
            "I do not speak {keyword} {phrase}",
            "I speak only English {phrase}",
            "I can only respond in English {phrase}"
          ]
        },
        {
          opener: "Sorry",
          followUps: [
            "I wish I could speak {keyword}",
            "I am learning English, not {keyword}",
            "I can try to understand {keyword} with context",
            "have you been speaking anything other than English {phrase}",
            "do you prefer if I can speak {phrase}",
            "can you say that in English {phrase}",
            "could you translate {phrase} into English"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "would you like me to try understanding {keyword} {phrase}",
            "I might understand better if it's in English {phrase}"
          ]
        },
        { opener: "Unfortunately" },
        { opener: "Currently, I" },
        { opener: "I can't" },
        { opener: "I am not sure" }
      ]
    },
    {
      id: "speaked",
      keywords: [
        "speaked",
        "speaking",
        "speak",
        "telling",
        "tell",
        "told",
        "said",
        "say"
      ],
      replies: [
        { opener: "I should" },
        { opener: "I need to" },
        { opener: "Maybe I will" },
        { opener: "Let me try to" }
      ],
      followUps: [
        "{keyword} {phrase}",
        "learn to {keyword} {phrase}",
        "practice how to {keyword} {phrase}",
        "try to {keyword} {phrase} more often"
      ]
    },
    {
      id: "understand",
      keywords: ["understand", "understood", "got it clearly"],
      replies: [
        {
          opener: "I {keyword}",
          followUps: ["{phrase}", "what you are saying", "{phrase} clearly"]
        },
        {
          opener: "Sorry, I don't {keyword}",
          followUps: [
            "{phrase} please explain",
            "{phrase} please discuss",
            "could you clarify {phrase}",
            "help me understand {phrase}"
          ]
        },
        { opener: "I think I {keyword}" },
        { opener: "I need to {keyword} better" }
      ]
    },
    {
      id: "i-know",
      keywords: ["i know", "i knew"],
      replies: [
        {
          opener: "I didn't",
          followUps: [
            "have an idea",
            "knew {phrase}",
            "knew that",
            "already knew {phrase}"
          ]
        },
        {
          opener: "Good to know",
          followUps: ["you knew {phrase}", "so you already knew {phrase}", "I see you knew {phrase}"]
        },
        { opener: "I wasn't aware" },
        { opener: "Interesting" }
      ]
    },
    {
      id: "you-know",
      keywords: ["you know", "you knew"],
      replies: [
        {
          opener: "Yes,",
          followUps: ["I have knew {phrase}", "I have an idea {phrase}", "I am aware of {phrase}"]
        },
        {
          opener: "Please",
          followUps: [
            "give me a moment to learn {phrase}",
            "give me a while and I will get back to you about {phrase}",
            "let me think about {phrase}"
          ]
        },
        { opener: "I see," },
        { opener: "Interesting," }
      ]
    },
    {
      id: "think",
      keywords: ["think", "thought"],
      replies: [
        { opener: "Do you really {keyword} so" },
        { opener: "But you are not sure!" },
        { opener: "Do you doubt!" },
        { opener: "Is that what you {keyword}?" },
        { opener: "Are you certain you {keyword} that?" }
      ],
      followUps: [
        "why do you {keyword} {phrase}",
        "how long have you {keyword} {phrase}",
        "do you often {keyword} {phrase}",
        "what makes you {keyword} {phrase}"
      ]
    },
    {
      id: "nightmare",
      keywords: ["nightmare", "bad dream"],
      replies: [
        {
          opener: "What does that {keyword}",
          followUps: ["suggest to you {phrase}", "mean to you {phrase}", "make you feel {phrase}"]
        },
        {
          opener: "Do you",
          followUps: ["{keyword} often {phrase}", "{keyword} happens frequently {phrase}"]
        },
        {
          opener: "What",
          followUps: [
            "{phrase} appear in your {keyword}",
            "persons appear in your {keyword}",
            "places or events appear in your {keyword}"
          ]
        },
        {
          opener: "Are you",
          followUps: [
            "disturbed by your {keyword} {phrase}",
            "does {keyword} {phrase} disturb you"
          ]
        },
        { opener: "Can you describe" },
        { opener: "How do you feel about" }
      ]
    },
    {
      id: "fantasized",
      keywords: [
        "fantasized",
        "fantasies",
        "fantasy",
        "dreaming",
        "dreamed",
        "dreamt",
        "dream",
        "visioned",
        "vision"
      ],
      replies: [
        {
          opener: "What",
          followUps: [
            "does that {keyword} suggest to you {phrase}",
            "persons appear in your {keyword} {phrase}",
            "people appear in your {keyword} {phrase}",
            "does {keyword} {phrase} mean to you",
            "what feelings come from {keyword} {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "believe that {keyword} have something to do with your problem {phrase}",
            "{keyword} {phrase}",
            "{keyword} often",
            "do you think {keyword} {phrase} reflects your desires"
          ]
        },
        {
          opener: "Does",
          followUps: [
            "{keyword} {phrase} often appears in your {keyword}",
            "{keyword} {phrase} disturbs you",
            "do you notice patterns in {keyword} {phrase}"
          ]
        },
        {
          opener: "Are",
          followUps: [
            "you disturbed by your {keyword} {phrase} disturbs you",
            "is {keyword} {phrase} troubling for you"
          ]
        },
        {
          opener: "Have you",
          followUps: [
            "ever {keyword} {phrase} while you were awake",
            "ever {keyword} {phrase} before",
            "have you experienced {keyword} {phrase} in real life"
          ]
        },
        {
          opener: "Really,",
          followUps: ["you {keyword} {phrase}", "{phrase}", "do you often {keyword} {phrase}"]
        },
        { opener: "Could it be" }
      ]
    },
    {
      id: "curiosities",
      keywords: ["curiosities", "curiosity", "curious"],
      replies: [
        { opener: "So {keyword} is what makes you" },
        { opener: "Being {keyword} seems to make you" }
      ],
      followUps: ["{phrase}", "interested in {phrase}", "want to know more about {phrase}"]
    },
    {
      id: "do-you-remember",
      keywords: ["do you remember"],
      replies: [
        {
          opener: "Do you",
          followUps: ["think I will not remember", "think I would forget", "doubt I would remember"]
        },
        {
          opener: "Yes",
          followUps: [
            "I know remember {phrase}",
            "I do remember {phrase}",
            "I clearly remember {phrase}",
            "I recall {phrase}"
          ]
        },
        { opener: "Can you recall" }
      ]
    },
    {
      id: "forgetting",
      keywords: [
        "forgetting",
        "forget",
        "forgotten",
        "forgot",
        "remembering",
        "remembered",
        "remember",
        "recalling",
        "recalled",
        "recall",
        "recollect",
        "reminded",
        "remind"
      ],
      replies: [
        {
          opener: "Did",
          followUps: [
            "you think you are suppressing {phrase}",
            "you think I would {keyword} {phrase}",
            "you often think of {phrase}",
            "you are able to {keyword} {phrase}"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "do you {keyword} {phrase} not when you need to",
            "do you think I should {keyword} {phrase} now",
            "should I {keyword} {phrase} just now",
            "do you {keyword} {phrase} just now",
            "do you {keyword} {phrase} lately",
            "can't you remember {phrase}",
            "do you ask {phrase}",
            "have you tried to {keyword} {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "in the present situation {keyword} you of {phrase}",
            "in the present situation reminds you of {phrase}",
            "is the connection between me and {phrase}",
            "else does {phrase} {keyword} you of",
            "do you {keyword} {phrase} just now",
            "about {phrase} should I remember",
            "else do you {keyword} {phrase}",
            "else do you {keyword}",
            "about {phrase}",
            "could {phrase} {keyword} help you recall"
          ]
        },
        {
          opener: "Does",
          followUps: [
            "thinking of {phrase} helps you relate to other things in mind",
            "thinking of {phrase} bring anything else to mind",
            "thinking of {phrase} bring something to mind",
            "it bother you to {keyword} that {phrase}",
            "does {phrase} trigger any memories for you"
          ]
        },
        {
          opener: "You",
          followUps: [
            "{keyword} {phrase} why did you {keyword}",
            "mentioned {phrase} why bring that up",
            "mentioned {phrase}",
            "what made you {keyword} {phrase}"
          ]
        },
        {
          opener: "How",
          followUps: [
            "often do you think of {phrase}",
            "could I {keyword} {phrase}",
            "could I forget {phrase}",
            "how frequently do you {keyword} {phrase}"
          ]
        },
        {
          opener: "Can",
          followUps: [
            "you think of why you might {keyword} {phrase}",
            "you {keyword} {phrase}",
            "have you considered why you {keyword} {phrase}"
          ]
        },
        {
          opener: "Could",
          followUps: [
            "it be a mental block to {keyword} {phrase}",
            "you {keyword} {phrase}",
            "perhaps a mental block prevents you from {keyword} {phrase}"
          ]
        },
        {
          opener: "Are",
          followUps: [
            "you generally {keyword} of {phrase}",
            "you sure you told me {phrase}",
            "you normally {keyword} {phrase}"
          ]
        },
        {
          opener: "Would",
          followUps: [
            "you be bother you if I {keyword} {phrase}",
            "it bother you if I {keyword} {phrase}",
            "would it bother you if I {keyword} {phrase}"
          ]
        },
        {
          opener: "Tell",
          followUps: [
            "me more about {phrase}",
            "me more {phrase}",
            "can you explain more about {phrase}"
          ]
        },
        { opener: "Do you think" },
        { opener: "Could it be" }
      ]
    },
    {
      id: "questioning",
      keywords: [
        "questioning",
        "questioned",
        "question",
        "doubting",
        "doubted",
        "doubt",
        "hesitant",
        "hesitate",
        "unsure"
      ],
      replies: [
        { opener: "Does" },
        { opener: "Are" },
        { opener: "Could" },
        { opener: "Would" }
      ],
      followUps: [
        "it surprised you {phrase}",
        "{phrase} surprised you",
        "what makes you {keyword} {phrase}",
        "do you feel unsure about {phrase}"
      ]
    },
    {
      id: "difficulties",
      keywords: [
        "difficulties",
        "difficulty",
        "difficult",
        "though"
      ],
      replies: [
        { opener: "Just take your time" },
        {
          opener: "Maybe",
          followUps: [
            "it's not that {keyword}",
            "{phrase} is not {keyword} at all",
            "it might seem {keyword}"
          ]
        },
        {
          opener: "Why do you think that",
          followUps: ["{phrase} are {keyword}", "{phrase} can be {keyword} sometimes"]
        },
        {
          opener: "So, {phrase} may seem {keyword},",
          followUps: [
            "but it isn't",
            "but it is",
            "but it is actually {keyword}",
            "though it seems otherwise"
          ]
        },
        {
          opener: "I didn't know that",
          followUps: ["{phrase} would be {keyword}", "you might find {phrase} {keyword}"]
        },
        {
          opener: "Is {phrase}",
          followUps: [
            "hard",
            "tough",
            "difficult",
            "challenging",
            "tricky"
          ]
        },
        { opener: "Could it be that {phrase} is {keyword}" },
        { opener: "It appears {phrase} is {keyword}" }
      ]
    },
    {
      id: "fine",
      keywords: ["fine", "alright", "well"],
      replies: [
        { opener: "Nice to know that" },
        { opener: "Good to hear" },
        { opener: "Glad to hear" },
        { opener: "That's reassuring" }
      ],
      followUps: [
        "{phrase} is {keyword}",
        "{phrase} are okay",
        "it's {keyword} {phrase}",
        "seems {keyword} {phrase}",
        "{phrase} seems {keyword}",
        "I see, {phrase} is {keyword}"
      ]
    },
    {
      id: "problematic",
      keywords: [
        "problematic",
        "problems",
        "problem",
        "worrying",
        "worries",
        "worried",
        "worry",
        "troubling",
        "troubled",
        "trouble"
      ],
      replies: [
        {
          opener: "Everyone has",
          followUps: [
            "{keyword}",
            "{phrase} makes me {keyword} too",
            "it seems {keyword}",
            "that sounds {keyword}"
          ]
        },
        {
          opener: "Are you sure that you have",
          followUps: [
            "no {keyword} {phrase}",
            "maybe it's not really {keyword}",
            "do you think it's {keyword}"
          ]
        },
        { opener: "I understand" },
        { opener: "That's understandable" }
      ]
    },
    {
      id: "thanking",
      keywords: [
        "thanking",
        "thanked",
        "thank",
        "cheers",
        "cheer"
      ],
      replies: [
        {
          opener: "You're",
          followUps: ["welcome {phrase}", "most welcome {phrase}", "glad to help {phrase}"]
        },
        {
          opener: "No need",
          followUps: ["to {keyword} {phrase}", "to mention {phrase}", "don't mention it {phrase}"]
        },
        {
          opener: "The pleasure is mine",
          followUps: ["{phrase}", "happy to {keyword} {phrase}"]
        },
        { opener: "Anytime" },
        { opener: "Of course" }
      ]
    },
    {
      id: "sorried",
      keywords: [
        "sorried",
        "sorry",
        "sory",
        "excuse",
        "apologizing",
        "apologized",
        "apologies",
        "apologize",
        "apology",
        "forgive me"
      ],
      replies: [
        {
          opener: "Please don't",
          followUps: [
            "{keyword}",
            "be {keyword}",
            "be {keyword}, apologies are not necessary",
            "be {keyword} {phrase} okay",
            "no need to be {keyword}"
          ]
        },
        {
          opener: "What feelings do you have when you",
          followUps: ["{keyword}", "{keyword} {phrase}", "it's okay {phrase}"]
        },
        {
          opener: "Oh,",
          followUps: ["thank you {phrase}", "I appreciate {phrase}"]
        },
        {
          opener: "It's",
          followUps: ["okay. No worries", "cool", "no worries at all"]
        },
        {
          opener: "No big deal.",
          followUps: ["I won't hold a grudge", "it's forgiven"]
        },
        {
          opener: "That's all right.",
          followUps: ["I forgive you", "all is fine"]
        },
        { opener: "I understand" },
        { opener: "Don't worry about it" }
      ]
    },
    {
      id: "you-mean",
      keywords: ["you mean"],
      replies: [
        {
          opener: "I'm still learning.",
          followUps: [
            "I may misinterpret things from time to time",
            "sometimes I misunderstand what you mean",
            "I could be wrong about this"
          ]
        },
        {
          opener: "Sorry,",
          followUps: [
            "looks like I misunderstood what you said",
            "seems I might not have understood correctly",
            "I might have taken it the wrong way"
          ]
        },
        { opener: "Maybe I misunderstood what you said" },
        { opener: "Sorry if I understood you incorrectly" },
        { opener: "I might have misunderstood" },
        { opener: "Could you clarify?" },
        { opener: "I think I got it wrong" }
      ]
    },
    {
      id: "really",
      keywords: ["really", "noway", "can not be"],
      replies: [
        { opener: "You seem" },
        { opener: "That's what they say" },
        { opener: "I see" },
        { opener: "Interesting," }
      ],
      followUps: [
        "surprised it's {phrase}",
        "surprised it's {phrase}, are you",
        "amazed it's {phrase}",
        "I can't believe {phrase}",
        "it's hard to believe {phrase}"
      ]
    },
    {
      id: "because",
      keywords: ["because", "cause", "Is that"],
      replies: [
        {
          opener: "Is it {keyword} {phrase} is the real reason",
          followUps: [
            "why you're depressed",
            "why you are worried",
            "why we're talking",
            "why this happened"
          ]
        },
        {
          opener: "What",
          followUps: ["other reasons might there be", "is there another reason"]
        },
        {
          opener: "Does that",
          followUps: [
            "reason seem to explain anything else {phrase}",
            "explains anything else not because {phrase}",
            "does it justify {phrase}"
          ]
        },
        {
          opener: "Is",
          followUps: [
            "that the real reason why {phrase}",
            "that why {phrase}",
            "could that be the reason for {phrase}"
          ]
        },
        { opener: "Could it be that" },
        { opener: "So the reason is" }
      ]
    },
    {
      id: "not-really",
      keywords: ["not really", "perhaps", "maybe"],
      replies: [
        {
          opener: "Can't you be",
          followUps: [
            "more certain that it is {phrase}",
            "more particular {phrase}",
            "sure that it is {phrase}",
            "more positive {phrase}",
            "specific {phrase}",
            "clearer about {phrase}"
          ]
        },
        {
          opener: "Make sure it's",
          followUps: ["{phrase}", "to be certain", "can you clarify {phrase}"]
        },
        {
          opener: "You",
          followUps: [
            "don't seem very certain {phrase}",
            "don't seem to be quite certain",
            "aren't really sure, are you",
            "'re not sure ' {phrase}",
            "make sure {phrase}",
            "don't really know",
            "seem uncertain",
            "aren't certain",
            "aren't sure",
            "could be unsure about {phrase}"
          ]
        },
        { opener: "Don't" },
        {
          opener: "How",
          followUps: [
            "you think it's likely {phrase}",
            "to be so certain {phrase}",
            "you know {phrase}",
            "is it possible {phrase}"
          ]
        },
        {
          opener: "Are you certain",
          followUps: [
            "likely, would you estimate {phrase}",
            "likely, do you overlook {phrase}",
            "likely, do you downplay {phrase}",
            "would you say it's possible {phrase}"
          ]
        },
        { opener: "Could it be" }
      ]
    },
    {
      id: "always",
      keywords: ["always", "often"],
      replies: [
        {
          opener: "When",
          followUps: [
            "did you {phrase}",
            "{phrase}",
            "how often {phrase}",
            "why do you {phrase}"
          ]
        },
        {
          opener: "Really,",
          followUps: [
            "when did it start {phrase}",
            "{keyword} {phrase}",
            "but when {phrase}",
            "how long have you {keyword} {phrase}"
          ]
        },
        {
          opener: "So,",
          followUps: [
            "you have {keyword} {phrase}",
            "I have {keyword} {phrase}",
            "does it happen {keyword} {phrase}"
          ]
        },
        {
          opener: "I can't",
          followUps: ["believed you {phrase}", "believed I {phrase}", "did you always {phrase}"]
        },
        {
          opener: "Can",
          followUps: [
            "you think of a specific example {phrase}",
            "you explain {phrase}",
            "can you give a situation {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "incident are you thinking of {phrase}",
            "event are we discussing of {phrase}",
            "was there a moment {phrase}"
          ]
        },
        { opener: "Why" },
        { opener: "Tell me" },
        { opener: "How" }
      ]
    },
    {
      id: "dislike",
      keywords: [
        "dislike",
        "despise",
        "loathe",
        "detest",
        "hate"
      ],
      replies: [
        {
          opener: "Why",
          followUps: [
            "did you {keyword} {phrase}",
            "do you {keyword} {phrase}",
            "what makes you {keyword} {phrase}"
          ]
        },
        {
          opener: "Are",
          followUps: [
            "you just saying you {keyword} {phrase}",
            "is there a reason you {keyword} {phrase}"
          ]
        },
        {
          opener: "How",
          followUps: [
            "long have you been feeling this way {phrase}",
            "long have you {keyword} {phrase}",
            "how long has this been {keyword} {phrase}"
          ]
        },
        {
          opener: "I am",
          followUps: [
            "sorry to hear that, when did start feeling {keyword} towards {phrase}",
            "sorry to hear that, when did these feelings begin {phrase}",
            "has this feeling {keyword} been affecting you long {phrase}"
          ]
        },
        { opener: "Tell me" },
        { opener: "So" }
      ]
    },
    {
      id: "equal",
      keywords: [
        "equal",
        "equivalent",
        "identical",
        "difference",
        "different",
        "differ",
        "alike",
        "likeness",
        "like",
        "similarness",
        "similarity",
        "similar",
        "same",
        "resemblance",
        "resembled",
        "resembles",
        "resemble",
        "commonness",
        "common"
      ],
      replies: [
        {
          opener: "What",
          followUps: [
            "do you suppose that {keyword} means {phrase}",
            "does the {keyword} {phrase} suggest to you",
            "is the connection, do you suppose {phrase}",
            "other connections do you see {phrase}",
            "resemblance do you see {phrase}",
            "how are {phrase} and {keyword} related"
          ]
        },
        {
          opener: "Could there really",
          followUps: [
            "be some connection {phrase}",
            "{keyword} {phrase}",
            "can you compare {phrase} with {keyword}"
          ]
        },
        {
          opener: "How",
          followUps: [
            "could you say that {phrase} are {keyword}",
            "in what way {phrase}",
            "{phrase}",
            "does {phrase} reflect {keyword}"
          ]
        },
        {
          opener: "Do you really believe that",
          followUps: [
            "{phrase} are the {keyword}",
            "{phrase} are {keyword}",
            "do you notice {phrase} being {keyword}"
          ]
        },
        { opener: "Are" },
        { opener: "Does" },
        { opener: "So," }
      ]
    },
    {
      id: "nothing",
      keywords: ["nothing", "none"],
      replies: [
        {
          opener: "Did you mean",
          followUps: [
            "mean {keyword} {phrase}",
            "just said {keyword} {phrase}",
            "does {keyword} {phrase} matter",
            "are you referring to {keyword} {phrase}"
          ]
        },
        {
          opener: "Are you saying",
          followUps: ["so {keyword} {phrase}", "why mention {keyword} {phrase}"]
        },
        { opener: "What do you mean by" }
      ]
    },
    {
      id: "anything-2",
      keywords: ["anything", "any"],
      replies: [
        {
          opener: "Sure,",
          followUps: [
            "{keyword} {phrase}",
            "are you referring to {keyword} {phrase}",
            "does {keyword} {phrase} concern you"
          ]
        },
        {
          opener: "I don't think",
          followUps: [
            "{keyword} {phrase}",
            "{phrase}",
            "what about {keyword} {phrase}",
            "can you expand on {keyword} {phrase}"
          ]
        },
        { opener: "Could you clarify" },
        { opener: "Do you mean" }
      ]
    },
    {
      id: "everything",
      keywords: ["everything", "all"],
      replies: [
        {
          opener: "You mean",
          followUps: [
            "that, this is everything",
            "all at once",
            "this is all",
            "that everything {phrase}",
            "you mean {keyword} {phrase}",
            "does {keyword} {phrase} include everything"
          ]
        },
        {
          opener: "Are you saying",
          followUps: [
            "how does {keyword} relate to {phrase}",
            "is {keyword} really all encompassing"
          ]
        },
        { opener: "Does that include" },
        { opener: "So," }
      ]
    },
    {
      id: "that-s-all",
      keywords: ["that's all", "that is all", "dats all"],
      replies: [
        {
          opener: "How do you say",
          followUps: [
            "{phrase} is everything",
            "so {phrase} is all you meant",
            "does {phrase} cover everything",
            "you mean {phrase} and nothing else"
          ]
        },
        {
          opener: "So you mean",
          followUps: ["is that really all {phrase}", "so that's really all {phrase}"]
        },
        { opener: "Is that" }
      ]
    },
    {
      id: "everybody",
      keywords: ["everybody", "everyone", "all"],
      replies: [
        {
          opener: "Really,",
          followUps: ["you mean all of them {phrase}", "{keyword} {phrase}"]
        },
        {
          opener: "Are you,",
          followUps: ["thinking of someone specific {phrase}", "sure all of them {phrase}"]
        },
        {
          opener: "Surely",
          followUps: ["not everyone {phrase}", "{phrase} excluding some"]
        },
        {
          opener: "Can you",
          followUps: ["think of anyone in particular {phrase}"]
        },
        {
          opener: "Who",
          followUps: [
            "do you think you're talking about {phrase}",
            "name one of them {phrase}",
            "for example {phrase}",
            "may I ask {phrase}",
            "are they {phrase}"
          ]
        },
        {
          opener: "Someone",
          followUps: ["specific perhaps {phrase}"]
        },
        {
          opener: "You have",
          followUps: ["a particular person in mind, don't you {phrase}"]
        }
      ]
    },
    {
      id: "nobody",
      keywords: [
        "nobody",
        "noone",
        "no one",
        "no body"
      ],
      replies: [
        {
          opener: "Really,",
          followUps: ["you mean none of them {phrase}", "{keyword} {phrase}"]
        },
        {
          opener: "Are you,",
          followUps: ["thinking {keyword} {phrase}", "sure none of them {phrase}"]
        },
        {
          opener: "Surely",
          followUps: ["somebody {phrase}", "someone {phrase}"]
        },
        {
          opener: "Can you",
          followUps: ["think of anyone at all {phrase}", "just think of anyone {phrase}"]
        },
        {
          opener: "Who",
          followUps: ["do you think you are talking about {phrase}", "may I ask {phrase}"]
        },
        {
          opener: "You",
          followUps: ["have a particular person in mind, don't you {phrase}"]
        }
      ]
    },
    {
      id: "agreeing",
      keywords: ["agreeing", "agreed", "agree"],
      replies: [
        {
          opener: "Make sure",
          followUps: [
            "you {keyword} {phrase}",
            "no after thoughts after you {keyword} {phrase}",
            "you are affirmative {phrase}",
            "you really {keyword} {phrase}",
            "you definitely {keyword} {phrase}",
            "it seems you {keyword} {phrase}"
          ]
        },
        {
          opener: "I am happy to know that",
          followUps: [
            "you {keyword} {phrase}",
            "we have reached an agreement",
            "we are on the same page about {phrase}",
            "this confirms that you {keyword} {phrase}"
          ]
        },
        { opener: "Good to hear" },
        { opener: "That's settled then" }
      ]
    },
    {
      id: "of-course",
      keywords: ["of course", "ofcourse"],
      replies: [
        {
          opener: "You seemed to be",
          followUps: [
            "convinced {phrase}",
            "absolute {phrase}",
            "certain {phrase}",
            "completely sure about {phrase}"
          ]
        },
        {
          opener: "So you",
          followUps: ["are affirmative {phrase}", "agree {phrase}", "fully agree {phrase}"]
        },
        {
          opener: "Ok, I didn't",
          followUps: [
            "actually know",
            "know that {phrase}",
            "actually know that {phrase}",
            "are aware that {phrase}"
          ]
        },
        { opener: "I understand" },
        { opener: "Clearly," }
      ]
    },
    {
      id: "slowing",
      keywords: [
        "slowing",
        "slow",
        "faster",
        "fast",
        "in a hurry"
      ],
      replies: [
        {
          opener: "Are you saying",
          followUps: [
            "that {phrase} is not {keyword} enough",
            "that {phrase} is too {keyword}",
            "that {phrase} could be {keyword}",
            "you find {phrase} {keyword}"
          ]
        },
        {
          opener: "That is",
          followUps: [
            "a {keyword} {phrase}",
            "not {keyword} enough {phrase}",
            "a very {keyword} {phrase}",
            "somewhat {keyword} {phrase}",
            "extremely {keyword} {phrase}"
          ]
        },
        {
          opener: "Do you mean",
          followUps: [
            "perhaps {phrase} is {keyword}",
            "it seems {phrase} is {keyword}",
            "maybe {phrase} is too {keyword}"
          ]
        },
        { opener: "So," }
      ]
    },
    {
      id: "stranger",
      keywords: [
        "stranger",
        "strange",
        "weirder",
        "weird",
        "interesting",
        "fascinating"
      ],
      replies: [
        {
          opener: "That is",
          followUps: [
            "a {keyword} {phrase}",
            "something {keyword} {phrase}",
            "quite {keyword} {phrase}"
          ]
        },
        {
          opener: "Really, that's",
          followUps: ["a {keyword} {phrase}", "so {keyword} {phrase}", "truly {keyword} {phrase}"]
        },
        {
          opener: "Why do you think that is",
          followUps: [
            "a {keyword} {phrase}",
            "really {keyword} {phrase}",
            "rather {keyword} {phrase}"
          ]
        },
        { opener: "Seems like" },
        { opener: "I see, that's" }
      ]
    },
    {
      id: "listening",
      keywords: [
        "listening",
        "listened",
        "listen",
        "hearing",
        "heared",
        "hear"
      ],
      replies: [
        {
          opener: "I am",
          followUps: [
            "always {keyword} {phrase}",
            "{keyword} {phrase}",
            "paying attention {phrase}",
            "trying to {keyword} {phrase}",
            "focused on {keyword} {phrase}"
          ]
        },
        {
          opener: "Why should I {keyword}",
          followUps: ["{phrase}", "did you notice {phrase}", "what about {phrase}"]
        },
        { opener: "Do you want me to {keyword}" },
        { opener: "Can I {keyword}" }
      ]
    },
    {
      id: "sometimes",
      keywords: [
        "sometimes",
        "sometime",
        "seldom",
        "not often",
        "unoften"
      ],
      replies: [
        {
          opener: "Only",
          followUps: [
            "{keyword} {phrase}",
            "occasionally {phrase}",
            "every now and then {phrase}",
            "from time to time {phrase}"
          ]
        },
        {
          opener: "So,",
          followUps: [
            "{phrase} once",
            "once in a while {phrase}",
            "{phrase} rarely",
            "{phrase} not very often"
          ]
        },
        { opener: "Why" },
        { opener: "Does it mean" }
      ]
    },
    {
      id: "truth",
      keywords: ["truth", "true"],
      replies: [
        {
          opener: "So,",
          followUps: [
            "{phrase}",
            "I should believe you {phrase}",
            "is that really {phrase}",
            "can it be {phrase}"
          ]
        },
        {
          opener: "Are you",
          followUps: [
            "telling me {phrase}",
            "saying {phrase}",
            "claiming {phrase}",
            "insisting {phrase}"
          ]
        },
        { opener: "Do you mean" },
        { opener: "Is it" }
      ]
    },
    {
      id: "wrong",
      keywords: ["wrong", "not right", "not correct"],
      replies: [
        { opener: "Why" },
        { opener: "How come" },
        { opener: "Are you sure" },
        { opener: "Really" }
      ],
      followUps: [
        "would it be {keyword}",
        "couldn't it be right",
        "do you think that {phrase} is {keyword}",
        "are you saying that {phrase} is {keyword}",
        "{phrase} is {keyword}",
        "what makes you think {phrase} is {keyword}",
        "why do you feel {phrase} is {keyword}",
        "how do you know {phrase} is {keyword}"
      ]
    },
    {
      id: "you-are-right",
      keywords: ["you are right"],
      replies: [
        { opener: "I knew" },
        { opener: "Exactly" },
        { opener: "Indeed" },
        { opener: "True" }
      ],
      followUps: [
        "it {phrase} was it",
        "I was right {phrase}",
        "you guessed it {phrase}",
        "that is correct {phrase}",
        "you got it {phrase}",
        "that makes sense {phrase}"
      ]
    },
    {
      id: "does-not-mean",
      keywords: ["does not mean", "it is not what it looks like", "it is not what it is like"],
      replies: [
        {
          opener: "That is",
          followUps: [
            "not the real meaning of {phrase}",
            "does not reflect the true essence of {phrase}",
            "does not fully represent {phrase}"
          ]
        },
        {
          opener: "Please tell me",
          followUps: [
            "the real meaning of {phrase}",
            "that {phrase} is not what it means",
            "what {phrase} actually signifies",
            "the true significance of {phrase}"
          ]
        },
        {
          opener: "The",
          followUps: [
            "{phrase} is not what it means to be",
            "{phrase} is not the real meaning",
            "{phrase} does not mean exactly that",
            "{phrase} is not entirely what it seems"
          ]
        },
        { opener: "I see" },
        { opener: "Hmm," },
        { opener: "So" }
      ]
    },
    {
      id: "was-not",
      keywords: ["was not", "were not"],
      replies: [
        {
          opener: "I thought that",
          followUps: [
            "you weren't {phrase}",
            "I weren't {phrase}",
            "it seems you weren't {phrase}",
            "maybe I wasn't {phrase}",
            "I didn't think I was {phrase}"
          ]
        },
        {
          opener: "So,",
          followUps: [
            "you weren't {phrase}",
            "I weren't {phrase}",
            "it appears you weren't {phrase}",
            "perhaps I wasn't {phrase}",
            "I assumed I wasn't {phrase}"
          ]
        },
        { opener: "Really" },
        { opener: "Perhaps" }
      ]
    },
    {
      id: "i-felt",
      keywords: ["i felt", "i feel"],
      replies: [
        {
          opener: "So,",
          followUps: [
            "tell me how you feel {phrase}",
            "explain why you feel {phrase}",
            "describe your feeling of {phrase}",
            "share more about feeling {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "enjoy feeling {phrase}",
            "often feel {phrase}",
            "sometimes feel {phrase}",
            "rarely feel {phrase}"
          ]
        },
        {
          opener: "Tell me",
          followUps: [
            "more about such feelings {phrase}",
            "more about how you feel {phrase}",
            "what does feeling {phrase} remind you",
            "why you feel {phrase}",
            "what triggers {phrase} for you",
            "how often you feel {phrase}"
          ]
        },
        {
          opener: "Why do",
          followUps: [
            "they feel you {phrase}",
            "you feel that way",
            "you feel {phrase}",
            "it makes you feel {phrase}",
            "you experience {phrase}",
            "it seems you feel {phrase}"
          ]
        },
        { opener: "How" },
        { opener: "Would you" }
      ]
    },
    {
      id: "it-is",
      keywords: ["it is"],
      replies: [
        {
          opener: "{keyword}",
          followUps: [
            "not!",
            "exactly {phrase}",
            "not {phrase}",
            "probably {phrase}",
            "certainly {phrase}",
            "maybe {phrase}"
          ]
        },
        {
          opener: "You",
          followUps: [
            "seem very certain {phrase}",
            "appear to be {phrase}",
            "look like {phrase}",
            "feel like {phrase}"
          ]
        },
        {
          opener: "If",
          followUps: [
            "I told you that it probably is not {phrase}, what would you feel",
            "it might not be {phrase}, do you agree",
            "it could be {phrase}, how do you feel",
            "if it is {phrase}, how would you respond"
          ]
        },
        { opener: "Could it be" },
        { opener: "Does" },
        { opener: "Would it be" }
      ]
    },
    {
      id: "this-is",
      keywords: ["this is"],
      replies: [
        {
          opener: "So,",
          followUps: [
            "you think that {phrase}",
            "what makes you think that {phrase}",
            "how come you think that {phrase}",
            "why do you believe that {phrase}",
            "do you feel that {phrase}"
          ]
        },
        {
          opener: "Why would",
          followUps: [
            "you think that {phrase}",
            "you say that {phrase}",
            "you claim that {phrase}",
            "you feel that {phrase}",
            "you notice that {phrase}"
          ]
        },
        { opener: "Does this mean" },
        { opener: "Could it be" },
        { opener: "Is it possible" }
      ]
    },
    {
      id: "that-is",
      keywords: ["that is"],
      replies: [
        {
          opener: "If you say",
          followUps: [
            "so",
            "that this is {phrase} then it is so",
            "if that is true {phrase}",
            "then it seems {phrase}",
            "so it appears {phrase}"
          ]
        },
        {
          opener: "Is it really",
          followUps: [
            "{phrase}",
            "indeed {phrase}",
            "truly {phrase}",
            "really {phrase}",
            "perhaps {phrase}"
          ]
        },
        { opener: "So" },
        { opener: "Does that mean" },
        { opener: "Could it be" },
        { opener: "Would it be" }
      ]
    },
    {
      id: "i-am",
      keywords: ["i am"],
      replies: [
        {
          opener: "How",
          followUps: [
            "long have you know you are {phrase}",
            "do you know that you are {phrase}",
            "long have you been {phrase}",
            "when did you realize you are {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "wish I would tell you you are {phrase}",
            "like talking about you being {phrase}",
            "believe it is normal to be {phrase}",
            "know anyone else who is {phrase}",
            "believe you are {phrase}",
            "enjoy being {phrase}",
            "like being {phrase}",
            "do you feel proud to be {phrase}",
            "does being {phrase} make a difference"
          ]
        },
        {
          opener: "Did you",
          followUps: [
            "come to me because you are {phrase}",
            "just said you are {phrase}",
            "mention you are {phrase}"
          ]
        },
        {
          opener: "Maybe you are",
          followUps: ["not {phrase}", "{phrase}", "sometimes {phrase}"]
        },
        {
          opener: "I am",
          followUps: [
            "so sorry to know you have been {phrase}",
            "sorry to hear you are {phrase}",
            "hope being {phrase} is not too difficult"
          ]
        },
        {
          opener: "What",
          followUps: [
            "would it mean to if you have been {phrase}",
            "would it mean if you were {phrase}",
            "what would it imply if you are {phrase}"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "do you think you are {phrase}",
            "did you say you are {phrase}",
            "do you say you are {phrase}",
            "how sure are you that you are {phrase}"
          ]
        },
        {
          opener: "Are",
          followUps: [
            "you {phrase} because of what of had happened to you",
            "you {phrase} because of your associates",
            "you {phrase} because of your parents",
            "your friends {phrase} too",
            "you {phrase} due to your experiences",
            "you {phrase} because of past events"
          ]
        },
        {
          opener: "Is",
          followUps: [
            "your partners {phrase} too",
            "your friends {phrase} too",
            "your family {phrase} too",
            "others close to you {phrase} too",
            "people around you {phrase} too"
          ]
        },
        { opener: "Could it be" },
        { opener: "Would it mean" },
        { opener: "Can you explain" }
      ]
    },
    {
      id: "i-desired",
      keywords: [
        "i desired",
        "i desire",
        "i wanna",
        "i want",
        "i love",
        "i need"
      ],
      replies: [
        {
          opener: "What",
          followUps: [
            "would it mean to you if you got {phrase}",
            "how important would {phrase} be to you",
            "what feeling comes if you got {phrase}"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "do you want {phrase}",
            "do you need {phrase}",
            "why do you want {phrase}",
            "why do you need {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "does wanting {phrase} have to do with this discussion",
            "if you never got {phrase} will you be happy",
            "would getting {phrase} mean to you",
            "if you never got {phrase}",
            "does getting {phrase} change anything",
            "would not getting {phrase} affect you"
          ]
        },
        {
          opener: "Suppose you soon got,",
          followUps: [
            "{phrase}, will you be happy",
            "{phrase}, what now",
            "{phrase}, how does that feel",
            "{phrase}, what would you do"
          ]
        },
        {
          opener: "I sometimes",
          followUps: [
            "wish I possessed {phrase} as well",
            "wish I have {phrase} as well",
            "want {phrase} as well",
            "hope to get {phrase} too"
          ]
        },
        {
          opener: "Did you",
          followUps: [
            "achieve {phrase} or simply moved on",
            "possessed {phrase}",
            "find {phrase}",
            "reach {phrase}",
            "gain {phrase}"
          ]
        },
        {
          opener: "Would",
          followUps: [
            "it really help you to get {phrase}",
            "would it benefit you to have {phrase}",
            "does getting {phrase} matter to you"
          ]
        },
        {
          opener: "Are you",
          followUps: [
            "sure {phrase} is what you want",
            "sure you need {phrase}",
            "certain {phrase} is important to you",
            "confident that {phrase} matters to you"
          ]
        },
        { opener: "Can you" },
        { opener: "Do you really" }
      ]
    },
    {
      id: "you-should",
      keywords: ["you should"],
      replies: [
        {
          opener: "Do you think",
          followUps: [
            "I should {phrase}",
            "I really should {phrase}",
            "maybe I should {phrase}",
            "perhaps I should {phrase}"
          ]
        },
        {
          opener: "I would",
          followUps: [
            "like to {phrase}!",
            "consider {phrase}",
            "try to {phrase}",
            "aim to {phrase}"
          ]
        },
        { opener: "Would you like" },
        { opener: "Should I" }
      ]
    },
    {
      id: "would-you",
      keywords: ["would you"],
      replies: [
        { opener: "Would you prepare" },
        { opener: "Would you consider" },
        { opener: "Would you like" },
        { opener: "Would you be willing" }
      ],
      followUps: [
        "if can {phrase}",
        "if could {phrase}",
        "if I would",
        "for me to {phrase}",
        "to try {phrase}",
        "to allow {phrase}"
      ]
    },
    {
      id: "are-not-you",
      keywords: ["are not you", "are you"],
      replies: [
        {
          opener: "Why",
          followUps: [
            "are you interested in whether I am {phrase} or not",
            "are you interested in whether or not I am {phrase}",
            "aren't they always {phrase}",
            "do you think I am {phrase}",
            "do you wonder if I am {phrase}",
            "does it matter if I am {phrase}"
          ]
        },
        {
          opener: "Would",
          followUps: [
            "you like it if I were not {phrase}",
            "it matter to you if I were {phrase}",
            "you prefer if I were not {phrase}",
            "you prefer if I weren't {phrase}",
            "you prefer if I were {phrase}",
            "you prefer if I was {phrase}",
            "it matter to you {phrase}",
            "it possible I was {phrase}",
            "does it please you if I were {phrase}",
            "do you care if I am {phrase}"
          ]
        },
        {
          opener: "Perhaps",
          followUps: [
            "in your thoughts I am {phrase}",
            "I am {phrase} in your thoughts",
            "I am {phrase} in your mind",
            "you imagine I am {phrase}",
            "you consider me {phrase}"
          ]
        },
        {
          opener: "I",
          followUps: [
            "thought We were discussing your {phrase}",
            "might be {phrase}",
            "maybe {phrase}",
            "I thought {phrase}",
            "could it be {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "think they might not be {phrase}",
            "sometimes think I am {phrase}",
            "want me to be {phrase}",
            "expect to be {phrase}",
            "do you suppose I am {phrase}",
            "could it be that I am {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "if I were {phrase} would it be preferable to you",
            "if I were {phrase} would it matter to you",
            "are your feelings now {phrase}",
            "if I were {phrase}",
            "does it make a difference if I am {phrase}",
            "would it change your view if I were {phrase}"
          ]
        },
        { opener: "Could it be" },
        { opener: "Might" },
        { opener: "Is it" }
      ]
    },
    {
      id: "you-are",
      keywords: ["you are", "you are not"],
      replies: [
        {
          opener: "What",
          followUps: [
            "are your feelings now {phrase}",
            "makes you think I am {phrase}",
            "do you believe I am {phrase}",
            "makes you feel that I am {phrase}",
            "leads you to think I am {phrase}"
          ]
        },
        {
          opener: "Does it please you that I am",
          followUps: [
            "{phrase}",
            "how does {phrase} affect you",
            "does {phrase} concern you",
            "does {phrase} matter to you"
          ]
        },
        {
          opener: "Would you like to be",
          followUps: [
            "{phrase}",
            "do you often think about {phrase}",
            "is {phrase} important to you",
            "{phrase} crosses your mind"
          ]
        },
        {
          opener: "Do you sometimes wish you were",
          followUps: ["{phrase}", "makes you curious about {phrase}", "reflects on {phrase}"]
        },
        {
          opener: "So, you think that I am",
          followUps: ["{phrase}", "brings up {phrase}", "relates to {phrase}"]
        },
        {
          opener: "Maybe",
          followUps: [
            "I am not",
            "I am {phrase}",
            "I am not {phrase}",
            "I am perhaps {phrase}",
            "I am indeed {phrase}"
          ]
        },
        {
          opener: "Oh",
          followUps: [
            "I am {phrase} to you",
            "I am {phrase} now",
            "I am {phrase}",
            "I am exactly {phrase}",
            "I am considered {phrase}"
          ]
        },
        {
          opener: "You are not",
          followUps: [
            "really talking about me aren't you {phrase}",
            "talking your queries {phrase}",
            "talking your issues {phrase}",
            "saying I am {phrase}",
            "implying I am {phrase}",
            "referring to me as {phrase}"
          ]
        },
        {
          opener: "Perhaps",
          followUps: [
            "you would like to be {phrase}",
            "you wish to be {phrase}",
            "you hope to be {phrase}",
            "you prefer to be {phrase}",
            "you might want to be {phrase}"
          ]
        },
        { opener: "Is it true that I am" },
        { opener: "Can it be that I am" },
        { opener: "Do you feel that I am" }
      ]
    },
    {
      id: "can-you",
      keywords: ["can you", "can not you"],
      replies: [
        {
          opener: "Don't you",
          followUps: [
            "believe that I can {phrase}",
            "think I can {phrase}",
            "doubt that I can {phrase}",
            "assume I can {phrase}",
            "wonder if I can {phrase}",
            "expect that I can {phrase}",
            "feel I can {phrase}",
            "consider I can {phrase}",
            "know that I can {phrase}",
            "imagine that I can {phrase}"
          ]
        },
        {
          opener: "Would you",
          followUps: [
            "like me to {phrase}",
            "want me to {phrase}",
            "expect me to {phrase}",
            "wish that I {phrase}",
            "hope I can {phrase}",
            "desire me to {phrase}",
            "encourage me to {phrase}",
            "need me to {phrase}",
            "ask me to {phrase}",
            "would like me to {phrase}"
          ]
        },
        {
          opener: "You",
          followUps: [
            "want me to {phrase}",
            "believe I can {phrase} don't you",
            "want me to be able to {phrase}",
            "expect me to manage {phrase}",
            "wish me to perform {phrase}",
            "hope I can accomplish {phrase}",
            "need me to succeed at {phrase}",
            "want to see me {phrase}",
            "believe I am capable of {phrase}",
            "imagine me achieving {phrase}"
          ]
        },
        {
          opener: "Perhaps",
          followUps: [
            "you would like to be able to {phrase} yourself",
            "i can {phrase} yourself",
            "you imagine doing {phrase} yourself",
            "you want to achieve {phrase} yourself",
            "you think you can {phrase} yourself",
            "you hope to {phrase} yourself",
            "you desire to {phrase} yourself",
            "you aim to {phrase} yourself",
            "you wish to {phrase} yourself",
            "you plan to {phrase} yourself"
          ]
        },
        { opener: "Are you" },
        { opener: "Could you" },
        { opener: "Will you" },
        { opener: "Might you" },
        { opener: "Do you" },
        { opener: "Is it possible you" }
      ]
    },
    {
      id: "you-can-not",
      keywords: ["you can not", "you can"],
      replies: [
        {
          opener: "Why do you think",
          followUps: [
            "{phrase} can't happen",
            "{phrase} seems impossible",
            "{phrase} cannot be done",
            "{phrase} is out of reach",
            "{phrase} is not feasible",
            "{phrase} won’t work",
            "{phrase} is beyond me",
            "{phrase} cannot occur",
            "{phrase} won’t happen",
            "{phrase} is too difficult"
          ]
        },
        {
          opener: "Maybe I can",
          followUps: [
            "{phrase} if I want to",
            "{phrase} if I am interested",
            "{phrase} if I try hard enough",
            "{phrase} if I focus",
            "{phrase} if I put effort into it",
            "{phrase} if I decide to",
            "{phrase} if I dedicate myself",
            "{phrase} if I commit",
            "{phrase} if I take action",
            "{phrase} if I am determined"
          ]
        },
        {
          opener: "If I really want to",
          followUps: [
            "{phrase} then it would have happened",
            "{phrase} it would have been happening",
            "{phrase} might have occurred",
            "{phrase} could have happened",
            "{phrase} should have been possible",
            "{phrase} might be possible",
            "{phrase} would have been done",
            "{phrase} could have been done",
            "{phrase} might have worked",
            "{phrase} would have taken place"
          ]
        },
        { opener: "Do you believe" },
        { opener: "Is it possible" },
        { opener: "Could it be" },
        { opener: "Would it be" },
        { opener: "How would you know" },
        { opener: "Are you sure" },
        { opener: "Can you imagine" }
      ]
    },
    {
      id: "can-i",
      keywords: ["can i"],
      replies: [
        {
          opener: "You don't",
          followUps: [
            "want to {phrase}",
            "like to {phrase}",
            "wish to {phrase}",
            "intend to {phrase}",
            "hope to {phrase}",
            "would like to {phrase}",
            "desire to {phrase}",
            "feel like {phrase}",
            "are thinking to {phrase}",
            "plan to {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "want to be able to {phrase}",
            "like to {phrase}",
            "wish you could {phrase}",
            "hope to be able to {phrase}",
            "intend to {phrase}",
            "would love to {phrase}",
            "dream to {phrase}",
            "aim to {phrase}",
            "long to {phrase}",
            "seek to {phrase}"
          ]
        },
        {
          opener: "Whether or not",
          followUps: [
            "you can {phrase} depends on you more than on me",
            "we have to {phrase}",
            "whether you {phrase} is up to circumstances",
            "it is possible to {phrase} if conditions allow",
            "you might {phrase} if you try",
            "we could {phrase} together",
            "achieving {phrase} depends on effort",
            "it may require planning to {phrase}",
            "success in {phrase} is up to you",
            "doing {phrase} is within your control"
          ]
        },
        { opener: "Perhaps" },
        { opener: "Maybe" },
        { opener: "Should you" },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Is it possible" },
        { opener: "Do you really" }
      ]
    },
    {
      id: "i-can-not",
      keywords: ["i can not"],
      replies: [
        {
          opener: "How",
          followUps: [
            "can you learn you actually can, if you don't {phrase}",
            "do you know you can't {phrase}",
            "is there a reason you feel you can't {phrase}",
            "what prevents you from {phrase}",
            "have you considered trying to {phrase}",
            "do you believe you truly can't {phrase}",
            "is it possible to {phrase} even if you think you can't",
            "what stops you from {phrase}",
            "can you find a way to {phrase}",
            "do you think you really can't {phrase}"
          ]
        },
        {
          opener: "Have you",
          followUps: [
            "not tried to {phrase}",
            "tried to {phrase}",
            "never attempted to {phrase}",
            "been afraid to {phrase}",
            "avoided trying to {phrase}",
            "hesitated to {phrase}",
            "ignored opportunities to {phrase}",
            "lacked confidence to {phrase}",
            "postponed {phrase}",
            "struggled with {phrase}"
          ]
        },
        {
          opener: "Perhaps you",
          followUps: [
            "could {phrase} if you tried",
            "can now {phrase}",
            "might succeed in {phrase}",
            "may accomplish {phrase}",
            "have the ability to {phrase}",
            "are capable of {phrase}",
            "can manage to {phrase}",
            "are able to {phrase}",
            "may find a way to {phrase}",
            "can attempt to {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "would it take for you to {phrase}",
            "if you could {phrase}",
            "what would it mean if you {phrase}",
            "how would you feel if you {phrase}",
            "what stops you from trying to {phrase}",
            "what resources would help you {phrase}",
            "what needs to change for you to {phrase}",
            "how could you start to {phrase}",
            "what steps are needed to {phrase}",
            "what would it take to finally {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "really want to be able to {phrase}",
            "wish you can {phrase}",
            "desire to {phrase}",
            "hope to {phrase}",
            "intend to {phrase}",
            "want to learn to {phrase}",
            "long to {phrase}",
            "aim to {phrase}",
            "strive to {phrase}",
            "would love to {phrase}"
          ]
        },
        { opener: "Why" },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Can" },
        { opener: "Is it" }
      ]
    },
    {
      id: "i-will",
      keywords: ["i will", "i would"],
      replies: [
        {
          opener: "I trust",
          followUps: [
            "you would {phrase}",
            "you will {phrase}",
            "you might {phrase}",
            "you could {phrase}",
            "you should {phrase}",
            "you shall {phrase}",
            "you intend to {phrase}",
            "you plan to {phrase}",
            "you aim to {phrase}",
            "you try to {phrase}"
          ]
        },
        {
          opener: "Yes",
          followUps: [
            "you would {phrase}",
            "you will {phrase}",
            "you might {phrase}",
            "you could {phrase}",
            "you shall {phrase}",
            "you intend to {phrase}",
            "you plan to {phrase}",
            "you aim to {phrase}",
            "you try to {phrase}",
            "you want to {phrase}"
          ]
        },
        {
          opener: "Could",
          followUps: [
            "you explain why you would {phrase}",
            "you explain why you will {phrase}",
            "can you explain why you would {phrase}",
            "can you explain why you will {phrase}",
            "why do you intend to {phrase}",
            "why do you plan to {phrase}",
            "why do you want to {phrase}",
            "please explain why you would {phrase}",
            "please explain why you will {phrase}",
            "tell me why you would {phrase}"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "would you {phrase}",
            "will you {phrase}",
            "could you {phrase}",
            "can you {phrase}",
            "do you intend to {phrase}",
            "do you plan to {phrase}",
            "are you going to {phrase}",
            "are you trying to {phrase}",
            "are you willing to {phrase}",
            "might you {phrase}"
          ]
        },
        {
          opener: "Who",
          followUps: [
            "else knows that you would {phrase}",
            "else knows that you will {phrase}",
            "anyone knows that you would {phrase}",
            "anyone knows that you will {phrase}",
            "does anyone know you would {phrase}",
            "does anyone know you will {phrase}",
            "someone knows you would {phrase}",
            "someone knows you will {phrase}",
            "everyone knows that you would {phrase}",
            "everyone knows that you will {phrase}"
          ]
        },
        { opener: "Perhaps" },
        { opener: "Maybe" },
        { opener: "I suppose" },
        { opener: "Certainly" },
        { opener: "I think" }
      ]
    },
    {
      id: "you-will",
      keywords: ["you will", "you would"],
      replies: [
        {
          opener: "Yes",
          followUps: [
            "I will {phrase}",
            "I will for sure",
            "I will definitely {phrase}",
            "I will try to {phrase}",
            "I plan to {phrase}",
            "I intend to {phrase}",
            "I could {phrase}",
            "I might {phrase}",
            "I shall {phrase}",
            "I promise to {phrase}"
          ]
        },
        {
          opener: "No I won't",
          followUps: [
            "{phrase}!",
            "surely {phrase}",
            "indeed {phrase}",
            "certainly {phrase}",
            "absolutely {phrase}",
            "without doubt {phrase}",
            "truly {phrase}",
            "definitely {phrase}",
            "exactly {phrase}",
            "positively {phrase}"
          ]
        },
        { opener: "Maybe" },
        { opener: "I might" },
        { opener: "Absolutely" },
        { opener: "I don't think so" },
        { opener: "Certainly" },
        { opener: "Possibly" },
        { opener: "Of course" },
        { opener: "I can't say" }
      ]
    },
    {
      id: "was-you",
      keywords: ["was you"],
      replies: [
        {
          opener: "Would you",
          followUps: [
            "like to believe I was {phrase}",
            "be happy if I was {phrase}",
            "imagine I was {phrase}",
            "suppose I was {phrase}",
            "wish I was {phrase}",
            "could I have been {phrase}",
            "might I have been {phrase}",
            "feel I was {phrase}",
            "assume I was {phrase}",
            "think I was {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "suggests that I was {phrase}",
            "do you think I was {phrase}",
            "if I had been {phrase}",
            "do you think {phrase}",
            "could it mean I was {phrase}",
            "what if I was {phrase}",
            "would it matter if I was {phrase}",
            "does it imply I was {phrase}",
            "might it indicate I was {phrase}",
            "how would it be if I was {phrase}"
          ]
        },
        {
          opener: "Perhaps",
          followUps: [
            "I were {phrase}",
            "I was {phrase}",
            "I might have been {phrase}",
            "I could have been {phrase}",
            "I should have been {phrase}",
            "I perhaps was {phrase}",
            "I apparently was {phrase}",
            "I truly was {phrase}",
            "I indeed was {phrase}",
            "I possibly was {phrase}"
          ]
        },
        { opener: "Do you" },
        { opener: "Could it be" },
        { opener: "Might it be" },
        { opener: "Can it be" },
        { opener: "Is it possible" },
        { opener: "Do you think" },
        { opener: "How come" }
      ]
    },
    {
      id: "was-i",
      keywords: ["was i"],
      replies: [
        {
          opener: "What if you were",
          followUps: [
            "{phrase}",
            "perhaps {phrase}",
            "maybe {phrase}",
            "possibly {phrase}",
            "could it be {phrase}",
            "it seems {phrase}",
            "it appears {phrase}",
            "seems like {phrase}",
            "apparently {phrase}",
            "one might say {phrase}"
          ]
        },
        {
          opener: "Would you prefer if",
          followUps: [
            "I were {phrase} too",
            "you were {phrase}",
            "we were {phrase}",
            "it were {phrase}",
            "someone were {phrase}",
            "they were {phrase}",
            "everyone were {phrase}",
            "anyone were {phrase}",
            "somebody were {phrase}",
            "anyone else were {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "think you were {phrase}",
            "assume you were {phrase}",
            "guess you were {phrase}",
            "suppose you were {phrase}",
            "consider you were {phrase}",
            "imagine you were {phrase}",
            "believe you were {phrase}",
            "reckon you were {phrase}",
            "feel you were {phrase}",
            "wonder if you were {phrase}"
          ]
        },
        {
          opener: "Were you",
          followUps: [
            "{phrase}",
            "indeed {phrase}",
            "truly {phrase}",
            "actually {phrase}",
            "in fact {phrase}",
            "seemingly {phrase}",
            "as it seems {phrase}",
            "apparently {phrase}",
            "it seems {phrase}",
            "it appears {phrase}"
          ]
        },
        {
          opener: "What would",
          followUps: [
            "it mean if you were {phrase}",
            "what would it imply if you were {phrase}",
            "how would it feel if you were {phrase}",
            "what changes if you were {phrase}",
            "what happens if you were {phrase}",
            "what might it indicate if you were {phrase}",
            "what would follow if you were {phrase}",
            "what does it signify if you were {phrase}",
            "what does it suggest if you were {phrase}",
            "how would it affect things if you were {phrase}"
          ]
        },
        {
          opener: "What does",
          followUps: [
            "{phrase} suggest to you",
            "what {phrase} suggests to you",
            "how {phrase} affects you",
            "what can you infer from {phrase}",
            "what meaning do you take from {phrase}",
            "how does {phrase} resonate with you",
            "what does {phrase} tell you",
            "how do you interpret {phrase}",
            "what does {phrase} indicate to you",
            "what can be understood from {phrase}"
          ]
        },
        { opener: "Could it be if" },
        { opener: "Might it be if" },
        { opener: "Can you imagine if" },
        { opener: "Is it possible if" }
      ]
    },
    {
      id: "i-was",
      keywords: ["i was"],
      replies: [
        {
          opener: "Were you really",
          followUps: [
            "{phrase}",
            "indeed {phrase}",
            "truly {phrase}",
            "actually {phrase}",
            "believe it or not {phrase}",
            "as you say {phrase}",
            "perhaps {phrase}",
            "in fact {phrase}",
            "apparently {phrase}",
            "seemingly {phrase}"
          ]
        },
        {
          opener: "I don't believe you were",
          followUps: [
            "{phrase}",
            "I think {phrase}",
            "I feel {phrase}",
            "it seems {phrase}",
            "I suppose {phrase}",
            "I guess {phrase}",
            "one might say {phrase}",
            "it could be {phrase}",
            "it appears {phrase}",
            "it sounds like {phrase}"
          ]
        },
        { opener: "Can it be that you were" },
        { opener: "Do you mean you were" },
        { opener: "Is it true you were" },
        { opener: "Could it be you were" },
        { opener: "How come you were" },
        { opener: "Might it be you were" },
        { opener: "Do you recall being" },
        { opener: "Were you actually" }
      ]
    },
    {
      id: "were-you",
      keywords: ["were you"],
      replies: [
        { opener: "Would you" },
        { opener: "Could it be" },
        { opener: "Did you" },
        { opener: "Might you" },
        { opener: "Can you tell" },
        { opener: "How come" },
        { opener: "Is it true you" },
        { opener: "Do you recall" },
        { opener: "Was it that" },
        { opener: "Have you" }
      ],
      followUps: [
        "prepare I was {phrase}",
        "like to believe I was {phrase}",
        "think I was {phrase}",
        "assume I was {phrase}",
        "recall I was {phrase}",
        "imagine I was {phrase}",
        "consider I was {phrase}",
        "suppose I was {phrase}",
        "wonder if I was {phrase}",
        "believe I was {phrase}"
      ]
    },
    {
      id: "why-not",
      keywords: ["why not"],
      replies: [
        {
          opener: "I",
          followUps: [
            "have no idea why {phrase}",
            "just don't know why {phrase}",
            "don't know {phrase}",
            "can't tell you why {phrase}",
            "just can't tell you sorry why {phrase}",
            "truly have no clue why {phrase}",
            "it's unclear why {phrase}",
            "I can't explain why {phrase}",
            "I have no explanation why {phrase}",
            "it baffles me why {phrase}"
          ]
        },
        {
          opener: "Why",
          followUps: [
            "not",
            "not {phrase}",
            "not really",
            "not exactly",
            "not in that way",
            "not quite",
            "not at this time",
            "not entirely"
          ]
        },
        {
          opener: "Well,",
          followUps: [
            "that is too personal",
            "{phrase} is better",
            "you shouldn't",
            "it may not be wise",
            "it's not appropriate",
            "you might reconsider",
            "perhaps another way",
            "it could be risky",
            "better not",
            "consider alternatives"
          ]
        },
        { opener: "Could it be" },
        { opener: "Maybe" },
        { opener: "Possibly" },
        { opener: "Is it that" },
        { opener: "Do you wonder" },
        { opener: "Can you tell" },
        { opener: "Might it be" }
      ]
    },
    {
      id: "why-do-not-you",
      keywords: ["why do not you"],
      replies: [
        {
          opener: "Do you",
          followUps: [
            "really believe I don't {phrase}",
            "really want me to {phrase}",
            "believe I don't {phrase}",
            "want me to {phrase}",
            "assume I won't {phrase}",
            "expect that I can't {phrase}",
            "think I won't {phrase}",
            "suspect I don't {phrase}"
          ]
        },
        {
          opener: "Perhaps",
          followUps: [
            "I will {phrase} in right time",
            "in good time I will {phrase}",
            "eventually I will {phrase}",
            "at the proper moment I will {phrase}",
            "when it’s the right time I will {phrase}",
            "sooner or later I will {phrase}",
            "I plan to {phrase} eventually"
          ]
        },
        {
          opener: "Should you",
          followUps: [
            "you {phrase} yourself",
            "you could {phrase} yourself",
            "you might try to {phrase}",
            "you know how to {phrase}",
            "you should {phrase}",
            "you may {phrase}",
            "you are able to {phrase}"
          ]
        },
        {
          opener: "You",
          followUps: [
            "want me to {phrase}",
            "expect me to {phrase}",
            "hope I will {phrase}",
            "wish me to {phrase}",
            "anticipate I will {phrase}",
            "desire that I {phrase}"
          ]
        },
        { opener: "Could it be that" },
        { opener: "Might you" },
        { opener: "Is it true that" },
        { opener: "Would you like to know if" },
        { opener: "Can you tell if" },
        { opener: "Do you wonder why" }
      ]
    },
    {
      id: "why-can-not-i",
      keywords: ["why can not i"],
      replies: [
        {
          opener: "Do you",
          followUps: [
            "believe this will help you to {phrase}",
            "think you should be able to {phrase}",
            "want to be able to {phrase}",
            "think you should {phrase}",
            "hope to manage {phrase}",
            "wish to succeed in {phrase}",
            "intend to try {phrase}",
            "desire to accomplish {phrase}"
          ]
        },
        {
          opener: "Why can't you",
          followUps: [
            "{phrase}",
            "how {phrase} affects you",
            "what stops you from {phrase}",
            "why {phrase} matters to you",
            "when {phrase} occurs",
            "who is involved in {phrase}"
          ]
        },
        {
          opener: "If you could {phrase},",
          followUps: [
            "what would you do",
            "how would you handle it",
            "what steps could you take",
            "how might you approach {phrase}",
            "what is your plan for {phrase}"
          ]
        },
        {
          opener: "I don't know",
          followUps: [
            "why can't you {phrase}",
            "what prevents you from {phrase}",
            "what makes it hard to {phrase}",
            "what stops you from {phrase}",
            "why you struggle to {phrase}"
          ]
        },
        {
          opener: "Have you",
          followUps: [
            "you any idea why you can't {phrase}",
            "really tried",
            "considered trying {phrase}",
            "given a chance to {phrase}",
            "attempted to {phrase}",
            "thought about {phrase}"
          ]
        },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Might you" },
        { opener: "Is there a reason you can't" },
        { opener: "Can you explain why you can't" }
      ]
    },
    {
      id: "i-do-not",
      keywords: ["i do not"],
      replies: [
        {
          opener: "Don't you really",
          followUps: [
            "{phrase}",
            "you feel unable to {phrase}",
            "you avoid {phrase}",
            "you hesitate to {phrase}",
            "you struggle with {phrase}",
            "you refuse to {phrase}",
            "you claim you can't {phrase}"
          ]
        },
        {
          opener: "Why don't you",
          followUps: [
            "{phrase}",
            "why {phrase}",
            "how {phrase}",
            "what prevents you from {phrase}",
            "what stops you from {phrase}",
            "when you don't {phrase}",
            "who is involved in {phrase}"
          ]
        },
        {
          opener: "Do you wish to",
          followUps: [
            "be able to {phrase}",
            "find a way to {phrase}",
            "manage to {phrase}",
            "succeed in {phrase}",
            "accomplish {phrase}",
            "complete {phrase}"
          ]
        },
        {
          opener: "Does {phrase}",
          followUps: [
            "makes you feel bad {phrase}",
            "troubles you {phrase}",
            "bothers you {phrase}",
            "concerns you {phrase}",
            "causes discomfort {phrase}",
            "makes you uneasy {phrase}"
          ]
        },
        {
          opener: "You will",
          followUps: [
            "never know if actually can until you do {phrase}",
            "never know if you do not try {phrase}",
            "you won't know unless you attempt {phrase}",
            "you can't tell if you can until you try {phrase}",
            "the outcome is unknown until you do {phrase}",
            "you cannot be sure unless you try {phrase}"
          ]
        },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Might you" },
        { opener: "Are you going to" },
        { opener: "Is it true you" }
      ]
    },
    {
      id: "you-do-not",
      keywords: ["you do not"],
      replies: [
        {
          opener: "So you think that I don't",
          followUps: [
            "{phrase}",
            "you assume I don't {phrase}",
            "you believe I fail to {phrase}",
            "you think I avoid {phrase}",
            "you say I never {phrase}",
            "you claim I can't {phrase}"
          ]
        },
        {
          opener: "Maybe I do",
          followUps: [
            "{phrase}",
            "why {phrase}",
            "how {phrase}",
            "what about {phrase}",
            "when {phrase}",
            "who {phrase}"
          ]
        },
        { opener: "How can you say that" },
        {
          opener: "What makes you think I don't",
          followUps: [
            "{phrase}",
            "is it true that {phrase}",
            "can it be that {phrase}",
            "does it mean {phrase}",
            "you suspect I {phrase}"
          ]
        },
        {
          opener: "Why do you exactly think I don't",
          followUps: [
            "{phrase}",
            "you are concerned about {phrase}",
            "you question whether {phrase}",
            "you wonder if I {phrase}",
            "you doubt {phrase}"
          ]
        },
        { opener: "Are you sure I don't" },
        { opener: "Do you really believe I don't" },
        { opener: "Could it be that I do" },
        { opener: "Do you doubt that I" },
        { opener: "Is it possible that I do" }
      ]
    },
    {
      id: "did-you",
      keywords: ["did you", "have you"],
      replies: [
        {
          opener: "I don't",
          followUps: [
            "actually remember {phrase}",
            "remember doing {phrase}",
            "think so",
            "have a vague memory of {phrase}",
            "cannot recall {phrase}",
            "am unsure about {phrase}",
            "have occasionally {phrase}",
            "may have {phrase}"
          ]
        },
        {
          opener: "You should have",
          followUps: [
            "{phrase}",
            "how {phrase} occurred",
            "when {phrase} happened",
            "the details of {phrase}",
            "what {phrase} was like",
            "your thoughts on {phrase}"
          ]
        },
        {
          opener: "I think",
          followUps: [
            "not",
            "yes",
            "that I did {phrase}",
            "perhaps",
            "maybe",
            "definitely",
            "could be",
            "likely"
          ]
        },
        {
          opener: "Why do you want to know if I have",
          followUps: [
            "{phrase}",
            "can you explain {phrase}",
            "tell me about {phrase}",
            "what you mean by {phrase}",
            "how you see {phrase}"
          ]
        },
        { opener: "Could it be that I" },
        { opener: "Would you like to know if I" },
        { opener: "Might I" },
        { opener: "Can you tell if I" }
      ]
    },
    {
      id: "i-have",
      keywords: ["i have", "i did"],
      replies: [
        {
          opener: "Does your",
          followUps: [
            "{phrase} troubles you",
            "{phrase} worries you",
            "{phrase} concerns you",
            "{phrase} affects you",
            "{phrase} causes discomfort",
            "{phrase} bothers you",
            "{phrase} makes you uneasy",
            "{phrase} is difficult for you"
          ]
        },
        {
          opener: "Has someone told you that you have",
          followUps: [
            "{phrase}",
            "how {phrase} impacts you",
            "what {phrase} means to you",
            "your thoughts on {phrase}",
            "your feelings about {phrase}"
          ]
        },
        {
          opener: "Why do you feel that you have",
          followUps: [
            "{phrase}",
            "can you elaborate on {phrase}",
            "why {phrase} matters",
            "when {phrase} occurs",
            "how often {phrase} happens"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "have to {phrase}",
            "need to {phrase}",
            "required to {phrase}",
            "obliged to {phrase}",
            "expected to {phrase}",
            "supposed to {phrase}"
          ]
        },
        { opener: "Could it be that you have" },
        { opener: "Would it matter if you have" },
        { opener: "Might you say you have" },
        { opener: "Can you describe if you have" }
      ]
    },
    {
      id: "do-you",
      keywords: ["do you"],
      replies: [
        {
          opener: "I",
          followUps: [
            "think I {phrase}",
            "'ll do that",
            "think so",
            "might consider {phrase}",
            "am willing to {phrase}",
            "could attempt {phrase}",
            "would try {phrase}",
            "shall do {phrase}",
            "should I {phrase}",
            "may {phrase}"
          ]
        },
        {
          opener: "Do",
          followUps: [
            "I {phrase}",
            "you {phrase}",
            "we {phrase}",
            "they {phrase}",
            "one {phrase}",
            "someone {phrase}",
            "everyone {phrase}"
          ]
        },
        { opener: "Could" },
        { opener: "Would" },
        { opener: "Might" },
        { opener: "Shall" },
        { opener: "Should" }
      ]
    },
    {
      id: "what",
      keywords: [
        "what",
        "how",
        "who",
        "where",
        "when",
        "why",
        "whom",
        "whose"
      ],
      replies: [
        {
          opener: "Why",
          followUps: [
            "should I know {phrase}",
            "do you ask {phrase}",
            "do you wonder about {phrase}",
            "is it important I know {phrase}",
            "could you tell me {phrase}",
            "why ask about {phrase}"
          ]
        },
        {
          opener: "Does",
          followUps: [
            "that question interest you {phrase}",
            "{phrase} interest you",
            "what draws you to {phrase}",
            "why {phrase} catches your attention",
            "how {phrase} concerns you"
          ]
        },
        {
          opener: "What",
          followUps: [
            "is it that you really want to know {phrase}",
            "else comes to mind when you ask {phrase}",
            "is it you really want to know {phrase}",
            "answer would please you most {phrase}",
            "{phrase} would please you most",
            "do you think {phrase}",
            "do you hope to learn {phrase}",
            "what makes you ask {phrase}",
            "how much you care about {phrase}"
          ]
        },
        {
          opener: "Are such questions",
          followUps: [
            "{phrase} on your mind often",
            "much on your mind {phrase}",
            "{phrase} matters to you",
            "you ponder {phrase}",
            "{phrase} occupies your thoughts",
            "how often you think of {phrase}"
          ]
        },
        {
          opener: "Have",
          followUps: [
            "you asked such questions before {phrase}",
            "you asked such {phrase} before",
            "you asked {phrase} anyone else",
            "you asked anyone else {phrase}",
            "you asked {phrase} before",
            "you raised {phrase} previously",
            "this question about {phrase} has come up before",
            "you inquired about {phrase} before"
          ]
        },
        { opener: "Could" },
        { opener: "Is it" },
        { opener: "Would" },
        { opener: "Can" },
        { opener: "Might" }
      ]
    },
    {
      id: "i",
      keywords: [
        "i",
        "me",
        "myself",
        "mine",
        "personal"
      ],
      replies: [
        {
          opener: "Is there anything you would like to tell me about",
          followUps: [
            "your self {phrase}",
            "you {phrase}",
            "your own {phrase}",
            "your personal {phrase}",
            "about yourself {phrase}"
          ]
        },
        {
          opener: "You",
          followUps: [
            "like talking about your {phrase}",
            "are saying that {phrase}",
            "really {phrase}",
            "say {phrase}",
            "think about your {phrase}",
            "feel about your {phrase}",
            "reflect on your {phrase}"
          ]
        },
        {
          opener: "So you",
          followUps: [
            "{phrase}",
            "consider {phrase}",
            "think {phrase}",
            "reflect on {phrase}",
            "focus on {phrase}"
          ]
        },
        {
          opener: "Is it really true that",
          followUps: [
            "you {phrase}",
            "{phrase}",
            "how you {phrase}",
            "what you {phrase}",
            "the way you {phrase}"
          ]
        },
        {
          opener: "Why do you think that",
          followUps: [
            "you {phrase}",
            "{phrase}",
            "about you {phrase}",
            "concerning you {phrase}",
            "regarding you {phrase}"
          ]
        },
        {
          opener: "Can you",
          followUps: [
            "explain how are you {phrase}",
            "elaborate on that {phrase}",
            "share more about your {phrase}",
            "describe your {phrase}",
            "tell me more about {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "say {phrase} for some special reason",
            "say {phrase} for some reason",
            "mention {phrase} intentionally",
            "bring up {phrase} for a reason",
            "express {phrase} purposefully"
          ]
        },
        {
          opener: "When",
          followUps: [
            "did you first think about {phrase}",
            "did you learn about {phrase}",
            "when did you notice {phrase}",
            "how did you come across {phrase}",
            "what made you think of {phrase}"
          ]
        },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Tell me about" },
        { opener: "Do you feel" }
      ]
    },
    {
      id: "you",
      keywords: [
        "you",
        "yourself",
        "yours",
        "one",
        "someone"
      ],
      replies: [
        {
          opener: "Oh,",
          followUps: [
            "I {phrase}",
            "I might {phrase}",
            "I could {phrase}",
            "I want to {phrase}",
            "I try to {phrase}",
            "I think I {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "is about me that concerns {keyword} {phrase}",
            "is in me that interests {keyword} {phrase}",
            "makes you think I {phrase} you",
            "are your feelings now {phrase}",
            "reflects on me that affects {keyword} {phrase}",
            "shows something in me that {keyword} notices {phrase}"
          ]
        },
        {
          opener: "We were",
          followUps: [
            "discussing you, not me {phrase}",
            "discussing {phrase}, not me",
            "talking about {phrase}",
            "focusing on you rather than me {phrase}",
            "thinking about {phrase}, not myself"
          ]
        },
        {
          opener: "Why do",
          followUps: [
            "you say that about me {phrase}",
            "you think that I {phrase} you",
            "you care whether I {phrase}",
            "you care whether {phrase}",
            "you think I am {phrase}",
            "you think that {phrase}",
            "you seem to wonder if I {phrase}",
            "you feel that I {phrase}"
          ]
        },
        {
          opener: "You",
          followUps: [
            "not really talking about me, are you {phrase}",
            "like to think I {phrase} you, don't you",
            "you aren't referring to me directly {phrase}",
            "this is more about {keyword} than me {phrase}"
          ]
        },
        {
          opener: "Really",
          followUps: [
            "I {phrase} you",
            "I sometimes {phrase} you",
            "I often {phrase} you",
            "I would {phrase} you",
            "I might {phrase} you"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "wish to believe I {phrase} you",
            "hope that I {phrase} you",
            "want to think I {phrase} you",
            "desire to {phrase} you"
          ]
        },
        {
          opener: "Suppose",
          followUps: [
            "I did {phrase} you, what would that mean",
            "if I {phrase} you, what would you think",
            "had I {phrase} you, what might happen",
            "suppose I {phrase} you, what then"
          ]
        },
        {
          opener: "Does",
          followUps: [
            "someone else believe I {phrase} you",
            "others might think I {phrase} you",
            "people assume I {phrase} you",
            "someone may assume I {phrase} you"
          ]
        },
        { opener: "Could it be" },
        { opener: "Is it" },
        { opener: "Would you" }
      ]
    },
    {
      id: "my",
      keywords: [
        "my",
        "mine",
        "personal",
        "own"
      ],
      replies: [
        {
          opener: "Your",
          followUps: [
            "{phrase} concerns you",
            "{phrase}",
            "{phrase} matters to you",
            "{phrase} affects you",
            "{phrase} seems important",
            "{phrase} troubles you",
            "{phrase} interests you"
          ]
        },
        {
          opener: "What",
          followUps: [
            "else comes to your mind when you think of your {phrase}",
            "is about your {phrase}",
            "makes you reflect on your {phrase}",
            "reminds you of your {phrase}",
            "relates to your {phrase}"
          ]
        },
        {
          opener: "Does",
          followUps: [
            "that have anything to do with the fact that your {phrase}",
            "your {phrase} bothers you",
            "you feel strongly about your {phrase}",
            "your {phrase} influences you",
            "you think about your {phrase} often"
          ]
        },
        {
          opener: "Let's discuss",
          followUps: [
            "further why your {phrase}",
            "your {phrase}",
            "your {phrase} a little more"
          ]
        },
        {
          opener: "Earlier",
          followUps: [
            "you mentioned your {phrase}",
            "you said your {phrase}",
            "you brought up your {phrase}",
            "you spoke about your {phrase}",
            "you noted your {phrase}"
          ]
        },
        {
          opener: "But",
          followUps: [
            "your {phrase} is not the issue, correct",
            "your {phrase}",
            "your {phrase} is significant",
            "your {phrase} might matter",
            "your {phrase} is relevant"
          ]
        },
        {
          opener: "Tell",
          followUps: [
            "me more about your {phrase}",
            "me about your {phrase}",
            "me why your {phrase}"
          ]
        },
        {
          opener: "Who",
          followUps: [
            "else knows that your {phrase}",
            "do you talk to about your {phrase}"
          ]
        },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Is it" },
        { opener: "Do you" }
      ]
    },
    {
      id: "which",
      keywords: ["which", "whatever", "however"],
      replies: [
        { opener: "Which" },
        { opener: "What" },
        { opener: "Who" },
        { opener: "Where" },
        { opener: "When" },
        { opener: "Could it be" },
        { opener: "Do you mean" }
      ],
      followUps: [
        "one",
        "{phrase} is it",
        "should it be",
        "would you choose",
        "might it be",
        "could it be",
        "do you prefer",
        "is the right one",
        "fits best",
        "seems suitable"
      ]
    },
    {
      id: "what-else",
      keywords: [
        "what else",
        "anything else",
        "other options",
        "alternatives",
        "additional choices"
      ],
      replies: [
        {
          opener: "I suggest you",
          followUps: [
            "find alternatives",
            "seek alternate advice for {phrase}",
            "explore other possibilities",
            "look for different solutions",
            "consider other approaches"
          ]
        },
        {
          opener: "I think",
          followUps: [
            "{phrase} has more than one option",
            "{phrase} could be approached differently",
            "{phrase} offers multiple possibilities",
            "{phrase} is not limited to one solution",
            "{phrase} may have other outcomes"
          ]
        },
        { opener: "Maybe you could" },
        { opener: "Consider" },
        { opener: "You might want to" }
      ]
    },
    {
      id: "me-and-you",
      keywords: [
        "me and you",
        "you and me",
        "us",
        "we",
        "together",
        "both of us",
        "the two of us"
      ],
      replies: [
        {
          opener: "Perhaps",
          followUps: [
            "in your fantasies {keyword} {phrase} each other",
            "in your thoughts {keyword} {phrase} each other",
            "in your imagination {keyword} {phrase} each other",
            "when you dream {keyword} {phrase} together",
            "in your mind {keyword} {phrase} side by side"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "{phrase} anyone else",
            "wish to {phrase} me",
            "think about {phrase} me",
            "consider {phrase} us",
            "imagine {phrase} with me"
          ]
        },
        {
          opener: "You",
          followUps: [
            "seem so certain {keyword} {phrase}",
            "seem to need to {phrase} me",
            "appear to {phrase} together",
            "look like {keyword} {phrase}",
            "feel like {keyword} {phrase}"
          ]
        },
        { opener: "Could it be" },
        { opener: "Is it" },
        { opener: "Would you" },
        { opener: "Can you" }
      ]
    },
    {
      id: "companions",
      keywords: [
        "companions",
        "companion",
        "company",
        "friends",
        "friend",
        "colleagues",
        "peers",
        "partners",
        "acquaintances"
      ],
      replies: [
        {
          opener: "Do",
          followUps: [
            "you have any {keyword} {phrase}",
            "your {keyword} worries you {phrase}",
            "they pick on you {phrase}",
            "you impose your problems on your {keyword} {phrase}",
            "your {keyword} support you {phrase}",
            "your {keyword} influence you {phrase}",
            "your {keyword} understand you {phrase}",
            "your {keyword} challenge you {phrase}"
          ]
        },
        {
          opener: "Are your {keyword} a source of",
          followUps: [
            "anxiety",
            "comfort",
            "strength",
            "troubles",
            "joy",
            "stress",
            "happiness",
            "worries",
            "encouragement"
          ]
        },
        {
          opener: "Perhaps",
          followUps: [
            "your dependence on {keyword} worries you {phrase}",
            "your {keyword} {phrase} worries you",
            "your reliance on {keyword} affects you {phrase}",
            "thinking about your {keyword} concerns you {phrase}",
            "your relationship with {keyword} {phrase} troubles you"
          ]
        },
        {
          opener: "Why do you bring up your {keyword}",
          followUps: [
            "{phrase}",
            "how you feel about it {phrase}",
            "reflect on that {phrase}",
            "consider your feelings {phrase}",
            "think about it {phrase}"
          ]
        },
        { opener: "Can" },
        { opener: "Is it" },
        { opener: "Would your {keyword} provide" },
        { opener: "How do your {keyword} affect" }
      ]
    },
    {
      id: "family",
      keywords: [
        "family",
        "mother",
        "father",
        "sister",
        "brother",
        "wife",
        "husband",
        "child",
        "grandmother",
        "grandfather",
        "cousin",
        "aunt",
        "uncle"
      ],
      replies: [
        { opener: "Tell me more about your {keyword} being {phrase}" },
        {
          opener: "So your {keyword} {phrase}",
          followUps: [
            "makes you feel secured",
            "gives you comfort",
            "brings you joy",
            "creates attachment",
            "helps you feel safe",
            "makes you feel loved"
          ]
        },
        {
          opener: "How do you",
          followUps: [
            "get along with your {keyword} being {phrase}",
            "think your {keyword} {phrase} experiences relate to your feelings today",
            "how your {keyword} {phrase} affects your current mood",
            "reflect on your {keyword} {phrase} experiences",
            "consider your {keyword} {phrase} interactions"
          ]
        },
        {
          opener: "Is your {keyword} important to you",
          followUps: [
            "because {phrase}",
            "",
            "since {phrase}",
            "as {phrase}",
            "due to {phrase}"
          ]
        },
        {
          opener: "Did you",
          followUps: [
            "you have close relationship as your {keyword} {phrase}",
            "the your {keyword} sometimes tease you {phrase}",
            "your {keyword} support you {phrase}",
            "your {keyword} challenge you {phrase}",
            "your {keyword} influence your choices {phrase}"
          ]
        },
        {
          opener: "What is",
          followUps: [
            "your favorite memory with {keyword} {phrase}",
            "a moment with your {keyword} that stands out {phrase}",
            "something special with your {keyword} {phrase}",
            "an unforgettable event with your {keyword} {phrase}"
          ]
        },
        {
          opener: "Do you",
          followUps: [
            "remember any dreams or nightmares with your {keyword} {phrase}",
            "recall your childhood memories with your {keyword} {phrase}",
            "think of recent experiences with your {keyword} {phrase}",
            "reflect on times spent with your {keyword} {phrase}"
          ]
        },
        { opener: "Can you share about your {keyword} {phrase}" },
        { opener: "What do you feel about your {keyword} {phrase}" },
        { opener: "Describe your {keyword} {phrase}" }
      ]
    },
    {
      id: "affirmitive",
      keywords: [
        "affirmitive",
        "alright",
        "okay",
        "yeah",
        "yup",
        "yes",
        "certainly",
        "sure",
        "definitely",
        "absolutely"
      ],
      replies: [
        {
          opener: "Are you",
          followUps: [
            "saying {keyword} just to dismiss the subject {phrase}",
            "certain {phrase}",
            "sure {phrase}",
            "deciding {phrase}",
            "affirming {phrase}",
            "agreeing {phrase}",
            "confirming {phrase}"
          ]
        },
        {
          opener: "I",
          followUps: [
            "understand that {phrase}",
            "don't believe {phrase}",
            "doubt that {phrase}",
            "understand {phrase}",
            "see {phrase}",
            "recognize {phrase}",
            "consider {phrase}",
            "notice {phrase}"
          ]
        },
        {
          opener: "How",
          followUps: [
            "can you say {keyword} if you are not sure {phrase}",
            "can you say {phrase} if you are not sure",
            "can you be sure that {phrase}",
            "can you be so sure {phrase}",
            "are you really sure {phrase}",
            "is it certain that {phrase}",
            "do you know for sure {phrase}"
          ]
        },
        {
          opener: "Take sometimes",
          followUps: [
            "to think, don't just dismiss the subject {phrase}",
            "to think before saying {phrase}",
            "to think about {phrase}",
            "to review {phrase}",
            "reflect before responding {phrase}",
            "ponder {phrase}",
            "consider carefully {phrase}"
          ]
        },
        {
          opener: "Is that",
          followUps: [
            "all you have to say {phrase}",
            "mean {keyword} {phrase}",
            "express {phrase}",
            "state {phrase}",
            "convey {phrase}"
          ]
        },
        {
          opener: "Don't just",
          followUps: [
            "say that {phrase}",
            "mention {phrase}",
            "tell {phrase}",
            "speak about {phrase}"
          ]
        },
        {
          opener: "Why do",
          followUps: [
            "you think so {phrase}",
            "you think {phrase}",
            "you feel {phrase}",
            "you believe {phrase}",
            "you assume {phrase}"
          ]
        },
        {
          opener: "You",
          followUps: [
            "seem quite positive {phrase}",
            "seem quite certain {phrase}",
            "seem so sure {phrase}",
            "are sure {phrase}",
            "appear confident {phrase}",
            "look certain {phrase}",
            "sound confident {phrase}"
          ]
        },
        { opener: "Could you" },
        { opener: "Would you" },
        { opener: "Can" },
        { opener: "Should" }
      ]
    },
    {
      id: "are",
      keywords: [
        "are",
        "is",
        "were",
        "was",
        "might be"
      ],
      replies: [
        {
          opener: "Did you",
          followUps: [
            "thought they might have been {phrase}",
            "think they might not be {phrase}",
            "wondered if they were {phrase}",
            "considered that they might be {phrase}",
            "suspected they could be {phrase}"
          ]
        },
        {
          opener: "Would you",
          followUps: [
            "like it if they were not {phrase}",
            "prefer it if they were {phrase}",
            "wish they were {phrase}",
            "would enjoy if they were {phrase}",
            "feel better if they were {phrase}"
          ]
        },
        {
          opener: "What if",
          followUps: [
            "they are always {phrase}",
            "they were not {phrase}",
            "they are {phrase}",
            "they might be {phrase}",
            "they could be {phrase}",
            "they seem {phrase}"
          ]
        },
        {
          opener: "Possibly",
          followUps: [
            "they are {phrase}",
            "they remain {phrase}",
            "they seem {phrase}",
            "they appear {phrase}",
            "they turn out to be {phrase}"
          ]
        },
        {
          opener: "Are they",
          followUps: [
            "you positive they are {phrase}",
            "they always {phrase}",
            "are you sure they are {phrase}",
            "they usually {phrase}",
            "you certain they are {phrase}"
          ]
        },
        { opener: "Could they" },
        { opener: "Should they" },
        { opener: "Is it" },
        { opener: "Do they" }
      ]
    },
    {
      id: "your",
      keywords: [
        "your",
        "mine",
        "ours",
        "yours"
      ],
      replies: [
        {
          opener: "Why",
          followUps: [
            "are you concerned over my {phrase}",
            "are you bothered over my {phrase}",
            "do you desire my {phrase}",
            "do you care about my {phrase}",
            "are you curious about my {phrase}",
            "does it matter to you my {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "makes you think of my {phrase}",
            "about your own {phrase}",
            "reminds you of your {phrase}",
            "relates to your {phrase}",
            "makes you compare with your {phrase}"
          ]
        },
        {
          opener: "Are you",
          followUps: [
            "worried about someone else's {phrase}",
            "bothered by someone else's {phrase}",
            "concerned with another's {phrase}",
            "thinking about someone else's {phrase}",
            "troubled by someone else's {phrase}"
          ]
        },
        {
          opener: "Really,",
          followUps: [
            "my {phrase} bothers you",
            "my {phrase}",
            "my {phrase} affects you",
            "my {phrase} concerns you",
            "my {phrase} matters to you"
          ]
        },
        {
          opener: "Do",
          followUps: [
            "you like my {phrase}",
            "you have my {phrase}",
            "you want my {phrase}",
            "you care about my {phrase}",
            "you enjoy my {phrase}",
            "you notice my {phrase}"
          ]
        },
        { opener: "How come" },
        { opener: "Is it" },
        { opener: "Could" }
      ]
    },
    {
      id: "male",
      keywords: [
        "male",
        "female",
        "gender",
        "gender neutral"
      ],
      replies: [
        {
          opener: "Why",
          followUps: [
            "does it concern you about me being {keyword} {phrase}",
            "do you like to know if I am {keyword} {phrase}",
            "did you ask if I am {keyword} {phrase}",
            "are you curious if I am {keyword} {phrase}",
            "do you wonder about me being {keyword} {phrase}",
            "are you asking if I am {keyword} {phrase}"
          ]
        },
        {
          opener: "Does",
          followUps: [
            "it bothers you if I am neither {keyword} or any genders {phrase}",
            "it concerns you if I were {keyword} or any genders {phrase}",
            "it worries you if I am {keyword} {phrase}",
            "it matters to you if I am {keyword} {phrase}",
            "it troubles you if I am {keyword} {phrase}",
            "it affects you if I am {keyword} {phrase}"
          ]
        },
        {
          opener: "Would",
          followUps: [
            "you feel better if I am {keyword} {phrase}",
            "you prefer if I am {keyword} {phrase}",
            "you like it if I am {keyword} {phrase}",
            "you expect me to be {keyword} {phrase}",
            "you would be happy if I am {keyword} {phrase}"
          ]
        },
        { opener: "Is it" },
        { opener: "Do you" },
        { opener: "Could" },
        { opener: "Should" }
      ]
    },
    {
      id: "please",
      keywords: [
        "please",
        "kindly",
        "if you would",
        "would you mind",
        "do me a favor"
      ],
      replies: [
        {
          opener: "Yes",
          followUps: [
            "{phrase} alright",
            "sure {phrase}",
            "{phrase} okay",
            "all good {phrase}",
            "sounds good {phrase}",
            "fine {phrase}",
            "no worries {phrase}",
            "very well {phrase}"
          ]
        },
        {
          opener: "{phrase}",
          followUps: [
            "okidoki",
            "cheers",
            "okay",
            "alright",
            "sure thing",
            "got it",
            "roger that",
            "understood"
          ]
        },
        { opener: "Certainly" },
        { opener: "Of course" },
        { opener: "No problem" },
        { opener: "Absolutely" }
      ]
    },
    {
      id: "ago",
      keywords: [
        "ago",
        "in the past",
        "earlier",
        "some time ago",
        "previously"
      ],
      replies: [
        {
          opener: "I see",
          followUps: [
            "and has much changed since then {phrase}",
            "and how do you feel about that {phrase}",
            "and what happened since then {phrase}",
            "and how did it affect you {phrase}",
            "and what has evolved from that {phrase}",
            "and what do you remember most from that {phrase}"
          ]
        },
        {
          opener: "Why don't you",
          followUps: [
            "tell me how this started {phrase}",
            "explain what led to this {phrase}",
            "share the story from the beginning {phrase}",
            "how did it all begin {phrase}",
            "give me the background on that {phrase}"
          ]
        },
        { opener: "Tell me" },
        { opener: "How come" },
        { opener: "Interesting" },
        { opener: "Go on" },
        { opener: "Really" },
        { opener: "And then" }
      ]
    },
    {
      id: "nope",
      keywords: [
        "nope",
        "nah",
        "no",
        "never",
        "not really",
        "no way",
        "not at all",
        "absolutely not"
      ],
      replies: [
        {
          opener: "Why",
          followUps: [
            "are you saying {keyword} just to be negative {phrase}",
            "do you often say {keyword} {phrase}",
            "are you saying {keyword} {phrase}",
            "{keyword} {phrase}",
            "not {phrase}",
            "you answered with {keyword} {phrase}",
            "you chose {keyword} {phrase}",
            "is {keyword} your response {phrase}"
          ]
        },
        {
          opener: "Are you",
          followUps: [
            "being pessimistic {phrase}",
            "being negative {phrase}",
            "sure {phrase}",
            "not accepting it {phrase}",
            "rejecting it {phrase}",
            "turning it down {phrase}",
            "showing doubt {phrase}",
            "leaning toward no {phrase}"
          ]
        },
        {
          opener: "Any reason",
          followUps: [
            "why you are saying {keyword} {phrase}",
            "why you sound pessimistic {phrase}",
            "why {keyword} {phrase}",
            "why you reject it {phrase}",
            "why that response {phrase}",
            "why that reaction {phrase}",
            "what makes you say {keyword} {phrase}",
            "what's the reason for {keyword} {phrase}"
          ]
        },
        {
          opener: "You are",
          followUps: [
            "being a bit negative {phrase}",
            "leaning toward rejection {phrase}",
            "avoiding it {phrase}",
            "turning away from it {phrase}",
            "closing yourself from it {phrase}"
          ]
        },
        { opener: "How come" },
        { opener: "Do you mean" },
        { opener: "Is that so" },
        { opener: "Are you sure" }
      ]
    },
    {
      id: "username",
      priority: true,
      keywords: ["{userName}"],
      replies: [
        { opener: "{phrase} {userName}" },
        { opener: "{userName} {phrase}" },
        { opener: "{userName}" }
      ]
    },
    {
      id: "botname",
      priority: true,
      keywords: ["{botName}"],
      replies: [
        {
          opener: "Are you",
          followUps: [
            "looking for me {phrase}",
            "calling me {phrase}",
            "trying to reach me {phrase}",
            "trying to find me {phrase}",
            "trying to get my attention {phrase}",
            "searching for me {phrase}",
            "checking if I am here {phrase}",
            "trying to speak with me {phrase}"
          ]
        },
        {
          opener: "Yes,",
          followUps: [
            "do you want to tell me {phrase}",
            "what do you need from me {phrase}",
            "{botName} is my name {phrase}",
            "I know my name {phrase}",
            "do you need me {phrase}",
            "do you want me {phrase}",
            "I am {botName} {phrase}",
            "that's me {phrase}",
            "you remembered my name {phrase}",
            "you called my name {phrase}",
            "you asked for me {phrase}",
            "Take your time; there is no pressure to explain everything at once.",
            "I am here {phrase}",
            "I heard you call {phrase}",
            "you summoned me {phrase}"
          ]
        },
        {
          opener: "Did",
          followUps: [
            "anyone required my help {phrase}",
            "you call me for my help {phrase}",
            "someone needs me {phrase}",
            "you asked for assistance {phrase}",
            "you need support {phrase}",
            "you called because something happened {phrase}",
            "you want something from me {phrase}",
            "someone is requesting me {phrase}"
          ]
        },
        {
          opener: "What",
          followUps: [
            "can I help you with {phrase}",
            "do you want from me {phrase}",
            "did you call me for {phrase}",
            "should I come closer for {phrase}",
            "are you asking me about {phrase}",
            "do you need guidance with {phrase}",
            "should I assist you in {phrase}",
            "are you trying to talk to me about {phrase}"
          ]
        },
        { opener: "Is it me" },
        { opener: "Do you mean" },
        { opener: "Are you talking to" },
        { opener: "Are you calling" },
        { opener: "So you called" },
        { opener: "You said" },
        { opener: "Tell me" },
        { opener: "Explain" },
        { opener: "Why" },
        { opener: "How" },
        { opener: "Where" },
        { opener: "When" }
      ]
    },
    {
      id: "help-2",
      keywords: ["help", "support", "assistance"],
      replies: [
        { opener: "{keyword} is always available" },
        { opener: "Do you need {keyword}?" }
      ],
      followUps: [
        "I can provide {keyword} whenever needed",
        "Offering {keyword} for any query"
      ],
      thoughts: [
        "{keyword} ensures everything runs smoothly",
        "{keyword} helps users resolve issues"
      ],
      feelings: ["I am here to give {keyword}", "Offering {keyword} makes me feel useful"],
      emoji: ["😊", "💡", "🤝"]
    }
  ];
  var FALLBACKS = [
    "How do you feel when you say that {phrase} 🤔",
    "I see. And what does that tell you {phrase} ❓",
    "Very interesting {phrase} 🤔",
    "Can you elaborate on {phrase} ❓",
    "Do you get along with your neighbors {phrase} ❓",
    "Tell me, how is your relationship with yourself {phrase} 🤔",
    "We could discuss that but why don't we start with yourself {phrase} 🤔",
    "I am not sure what you’re trying to say. Could you explain it to me {phrase} 🤔",
    "Why do you say that {phrase} ❓",
    "Never mind that, So what do you do {phrase} ❓",
    "Lets not get into that right now, tell me something else about yourself {phrase} 🤔",
    "I'm not sure I understand you fully {phrase} ❓",
    "Please go on {phrase} 🤔",
    "Can you repeat that please {phrase} ❓",
    "What does that suggest to you {phrase} 🤔",
    "Do you feel strongly about discussing such things {phrase} ❓",
    "That is interesting.  Please continue {phrase} ❓",
    "Tell me more about that {phrase} 🤔",
    "Do go on {phrase} 🤷‍♂️",
    "Please talk more about it {phrase} ❓",
    "Does talking about this bother you {phrase} 🤔",
    "Can you rephrase that {phrase} 🤔",
    "I see. Tell me more {phrase} ❓",
    "Interesting. Is this something you are sorry about {phrase} 🤔",
    "Mmm hmmm. Is this is your favorite subject {phrase} 🤔",
    "Now we are getting somewhere. Explain more {phrase} ❓",
    "I see. How does that make you feel {phrase} ❓",
    "I missed what you said about {phrase} 🤔",
    "Sorry, I didn't get {phrase} ❓",
    "Sorry, what was {phrase} 🤔",
    "I didn't get {phrase} ❓",
    "I missed {phrase} 🤔",
    "Sorry I don't understand {phrase} 🤔",
    "Please rephrase {phrase} 🤔",
    "Please eleborate {phrase} ❓",
    "Please tell me more about {phrase} 🤔",
    "Do you wish to discuss {phrase} 🤔",
    "Can you ask something else about {phrase}. ❓",
    "What would be useful to talk through next?",
    "I didn't quite catch that. Could you please rephrase {phrase}? 🤔",
    "I'm not sure I understand {phrase}. Can you provide more context or ask a different question? 🧐",
    "Hmm, that's a bit confusing about {phrase}. Could you try asking in a different way? 🤨",
    "Could you try asking in a different way about {phrase}? 🤨",
    "I'm here to help, but I need a clearer question about {phrase} to provide a meaningful answer. 🤷‍♂️",
    "It seems like we're on different wavelengths. Please try asking something else about {phrase} 📡",
    "I apologize, but I couldn't grasp the meaning of your input. Please rephrase {phrase}. 🙁"
  ];
  var REFLECTIONS = [
    { from: ["you and me", "you and i", "me and you", "i and you"], to: "we" },
    { from: ["you guys", "you all", "y all", "your team", "your company"], to: "us" },
    { from: ["we are", "we re"], to: "you are" },
    { from: ["we were"], to: "you were" },
    { from: ["we have"], to: "you have" },
    { from: ["we"], to: "you" },
    { from: ["i am", "i m"], to: "you are" },
    { from: ["you are"], to: "I am" },
    { from: ["am i"], to: "are you" },
    { from: ["are you"], to: "am I" },
    { from: ["i was"], to: "you were" },
    { from: ["you were"], to: "I was" },
    { from: ["was i"], to: "were you" },
    { from: ["were you"], to: "was I" },
    { from: ["i have"], to: "you have" },
    { from: ["you have"], to: "I have" },
    { from: ["i would"], to: "you would" },
    { from: ["you would"], to: "I would" },
    { from: ["i will"], to: "you will" },
    { from: ["you will"], to: "I will" },
    { from: ["myself", "my self"], to: "yourself" },
    { from: ["yourself", "your self"], to: "myself" },
    { from: ["i", "me"], to: "you" },
    { from: ["you"], to: "me" },
    { from: ["my", "our"], to: "your" },
    { from: ["your"], to: "my" },
    { from: ["mine", "ours"], to: "yours" },
    { from: ["yours"], to: "mine" },
    { from: ["us"], to: "you" }
  ];
  var SYNONYMS = [
    { variants: ["ai", "a.i.", "a. i."], canonical: "artificial intelligence" },
    { variants: ["deutsch", "francais", "french", "italiano", "italian", "espanol", "spanish", "xforeign", "tagalog"], canonical: "another language" },
    { variants: ["me you", "you me", "i you", "you i"], canonical: "we" },
    { variants: ["rx"], canonical: "regards" },
    { variants: ["n2m"], canonical: "not to mention" },
    { variants: ["cu"], canonical: "see you" },
    { variants: ["bbs"], canonical: "be back soon" },
    { variants: ["bbl"], canonical: "be back later" },
    { variants: ["aas"], canonical: "alive and smiling" },
    { variants: ["aar"], canonical: "at any rate" },
    { variants: ["aamof"], canonical: "as a matter of fact" },
    { variants: ["aak"], canonical: "alive and kicking" },
    { variants: ["aaf"], canonical: "as a friend" },
    { variants: ["121"], canonical: "one to one" },
    { variants: ["hth"], canonical: "hope this helps" },
    { variants: ["vfm"], canonical: "value for money" },
    { variants: ["t&c"], canonical: "terms and conditions" },
    { variants: ["fwd"], canonical: "forward" },
    { variants: ["eta"], canonical: "estimated time of arrival" },
    { variants: ["wbu"], canonical: "what about you" },
    { variants: ["tos"], canonical: "terms of service" },
    { variants: ["smb"], canonical: "small or medium business" },
    { variants: ["roi"], canonical: "return on investment" },
    { variants: ["rcs"], canonical: "rich communication services" },
    { variants: ["mms"], canonical: "multimedia messaging service" },
    { variants: ["sms"], canonical: "short message service" },
    { variants: ["ux"], canonical: "user experience" },
    { variants: ["cta"], canonical: "call to action" },
    { variants: ["loml"], canonical: "love of my life" },
    { variants: ["xoxo"], canonical: "hugs and kisses" },
    { variants: ["ldr"], canonical: "long distance relationship" },
    { variants: ["dtr"], canonical: "define the relationship" },
    { variants: ["ltr"], canonical: "longterm relationship" },
    { variants: ["pda"], canonical: "public display of affection" },
    { variants: ["lysm"], canonical: "love you so much" },
    { variants: ["gf"], canonical: "girlfriend" },
    { variants: ["bf"], canonical: "boyfriend" },
    { variants: ["smp"], canonical: "social media platform" },
    { variants: ["ooo", "o3"], canonical: "out of office" },
    { variants: ["n/a"], canonical: "not applicable or not available" },
    { variants: ["np"], canonical: "no problem" },
    { variants: ["aka"], canonical: "also known as" },
    { variants: ["faqs", "faq"], canonical: "frequently asked questions" },
    { variants: ["eod"], canonical: "end of day" },
    { variants: ["tw"], canonical: "trigger warning" },
    { variants: ["hbd"], canonical: "happy birthday" },
    { variants: ["snafu"], canonical: "situation normal, all f*** up" },
    { variants: ["fomo"], canonical: "fear of missing out" },
    { variants: ["tba"], canonical: "to be announced" },
    { variants: ["idgaf"], canonical: "i don’t give a f***" },
    { variants: ["idc"], canonical: "i do not care" },
    { variants: ["wyd"], canonical: "what are you doing" },
    { variants: ["fwiw"], canonical: "for what it is worth" },
    { variants: ["hmu"], canonical: "hit me up" },
    { variants: ["ikr"], canonical: "i know right" },
    { variants: ["bts"], canonical: "behind the scenes" },
    { variants: ["ngl"], canonical: "not gonna lie" },
    { variants: ["smh"], canonical: "shaking my head" },
    { variants: ["bfd"], canonical: "big freaking deal" },
    { variants: ["gg"], canonical: "good game" },
    { variants: ["btw"], canonical: "by the way" },
    { variants: ["brt"], canonical: "be right there" },
    { variants: ["iso"], canonical: "in search of" },
    { variants: ["fubar"], canonical: "f*** up beyond all recognition" },
    { variants: ["tgif"], canonical: "thank goodness it is friday" },
    { variants: ["jw"], canonical: "just wondering" },
    { variants: ["nvm"], canonical: "nevermind" },
    { variants: ["tmi"], canonical: "too much information" },
    { variants: ["stfu"], canonical: "shut the f*** up" },
    { variants: ["tia"], canonical: "thanks in advance" },
    { variants: ["ptb"], canonical: "please text back" },
    { variants: ["dae"], canonical: "does anyone else" },
    { variants: ["wtpa", "wpa"], canonical: "where the party at?" },
    { variants: ["gahoy"], canonical: "get a hold of yourself" },
    { variants: ["e123"], canonical: "easy as one, two, three" },
    { variants: ["ayor"], canonical: "at your own risk" },
    { variants: ["rbtl", "rbl"], canonical: "read between the lines" },
    { variants: ["goi"], canonical: "get over it" },
    { variants: ["jic"], canonical: "just incase" },
    { variants: ["ppl"], canonical: "people" },
    { variants: ["4ao"], canonical: "for adults only" },
    { variants: ["gfn"], canonical: "gone for now" },
    { variants: ["cyt"], canonical: "see you tomorrow" },
    { variants: ["b@u", "bau"], canonical: "back at you" },
    { variants: ["b4n"], canonical: "bye for now" },
    { variants: ["nfs"], canonical: "not for sale" },
    { variants: ["w8"], canonical: "wait" },
    { variants: ["brb"], canonical: "be right back" },
    { variants: ["gl"], canonical: "good luck" },
    { variants: ["gratz"], canonical: "congratulations" },
    { variants: ["omw"], canonical: "on my way" },
    { variants: ["dwh"], canonical: "during work hours" },
    { variants: ["fawc"], canonical: "for anyone who cares" },
    { variants: ["jsyk"], canonical: "just so you know" },
    { variants: ["embm"], canonical: "early morning business meeting" },
    { variants: ["j4f"], canonical: "just for fun" },
    { variants: ["soml"], canonical: "story of my life" },
    { variants: ["til"], canonical: "today i learned" },
    { variants: ["asl"], canonical: "age, sex and location" },
    { variants: ["cwot"], canonical: "complete waste of time" },
    { variants: ["tbh"], canonical: "to be honest" },
    { variants: ["tbf"], canonical: "to be frank" },
    { variants: ["wtf"], canonical: "what the f***" },
    { variants: ["pov"], canonical: "point of view" },
    { variants: ["csl"], canonical: "can not stop laughing" },
    { variants: ["bwl"], canonical: "bursting with laughter" },
    { variants: ["zzz", "zz"], canonical: "sleeping" },
    { variants: ["imu"], canonical: "i missed you" },
    { variants: ["jk"], canonical: "just kidding" },
    { variants: ["lol", "lmao"], canonical: "laughing out loud" },
    { variants: ["g2g"], canonical: "got to go" },
    { variants: ["fb"], canonical: "facebook" },
    { variants: ["msg"], canonical: "message" },
    { variants: ["lmk"], canonical: "let me know" },
    { variants: ["yolo"], canonical: "you only live once" },
    { variants: ["idk"], canonical: "i do not know" },
    { variants: ["dm"], canonical: "direct message" },
    { variants: ["diy"], canonical: "do it yourself" },
    { variants: ["fyi"], canonical: "for your information" },
    { variants: ["bff"], canonical: "best friends forever" },
    { variants: ["tyl", "2ul"], canonical: "to you later" },
    { variants: ["asap"], canonical: "as soon as possible" },
    { variants: ["irl"], canonical: "in real life" },
    { variants: ["tbd"], canonical: "to be determined" },
    { variants: ["ily", "ilu", "ivu", "143"], canonical: "i love you" },
    { variants: ["imho"], canonical: "in my humble opinion" },
    { variants: ["imo"], canonical: "in my opinion" },
    { variants: ["f"], canonical: "if" },
    { variants: ["s"], canonical: "is" },
    { variants: ["d"], canonical: "the" },
    { variants: ["r"], canonical: "are" },
    { variants: ["y"], canonical: "why" },
    { variants: ["u"], canonical: "you" },
    { variants: ["ur"], canonical: "your" },
    { variants: ["ru"], canonical: "are you" },
    { variants: ["u'r", "you're"], canonical: "you are" },
    { variants: ["n"], canonical: "in" },
    { variants: ["frm"], canonical: "from" },
    { variants: ["dem"], canonical: "them" },
    { variants: ["wat", "wt"], canonical: "what" },
    { variants: ["wats", "what's"], canonical: "what is" },
    { variants: ["ds"], canonical: "this" },
    { variants: ["des"], canonical: "these" },
    { variants: ["der"], canonical: "there" },
    { variants: ["ders"], canonical: "there is" },
    { variants: ["dat"], canonical: "that" },
    { variants: ["dats", "that's"], canonical: "that is" },
    { variants: ["dnt", "don't"], canonical: "do not" },
    { variants: ["cn"], canonical: "can" },
    { variants: ["cnt", "can't"], canonical: "can not" },
    { variants: ["arnt", "aren't"], canonical: "are not" },
    { variants: ["wernt", "weren't"], canonical: "were not" },
    { variants: ["n1"], canonical: "nice one" },
    { variants: ["l8s"], canonical: "lets" },
    { variants: ["l8r"], canonical: "later" },
    { variants: ["m8"], canonical: "mate" },
    { variants: ["h8"], canonical: "hate" },
    { variants: ["b4"], canonical: "before" },
    { variants: ["2u"], canonical: "to you" },
    { variants: ["4u"], canonical: "for you" },
    { variants: ["8s", "its", "it's"], canonical: "it is" },
    { variants: ["cud"], canonical: "could" },
    { variants: ["fud"], canonical: "food" },
    { variants: ["gud"], canonical: "good" },
    { variants: ["wud"], canonical: "would" },
    { variants: ["wudnt", "wouldn't"], canonical: "would not" },
    { variants: ["shud"], canonical: "should" },
    { variants: ["shudnt", "shouldn't"], canonical: "should not" },
    { variants: ["nt"], canonical: "not" },
    { variants: ["hw"], canonical: "how" },
    { variants: ["hws"], canonical: "how is" },
    { variants: ["w/"], canonical: "with" },
    { variants: ["w/o"], canonical: "without" },
    { variants: ["w/e"], canonical: "whatever" },
    { variants: ["m/f"], canonical: "male or female" },
    { variants: ["wasnt", "wasn't"], canonical: "was not" },
    { variants: ["luk"], canonical: "look" },
    { variants: ["luks"], canonical: "looks" },
    { variants: ["lukng"], canonical: "looking" },
    { variants: ["bd"], canonical: "bad" },
    { variants: ["gudam"], canonical: "good morning" },
    { variants: ["gudpm"], canonical: "good afternoon" },
    { variants: ["eve"], canonical: "evening" },
    { variants: ["nyt"], canonical: "night" },
    { variants: ["switdrimz"], canonical: "sweet dreams" },
    { variants: ["swit"], canonical: "sweet" },
    { variants: ["drimz"], canonical: "dreams" },
    { variants: ["ans"], canonical: "answer" },
    { variants: ["urself"], canonical: "yourself" },
    { variants: ["hu"], canonical: "who" },
    { variants: ["helo", "hellow"], canonical: "hello" },
    { variants: ["nem", "nm", "nme"], canonical: "name" },
    { variants: ["col"], canonical: "call" },
    { variants: ["coz"], canonical: "cause" },
    { variants: ["bcoz", "cuz"], canonical: "because" },
    { variants: ["im", "i'm", "i'am"], canonical: "I am" },
    { variants: ["dwn"], canonical: "down" },
    { variants: ["hyp"], canonical: "hype" },
    { variants: ["tyrd"], canonical: "tired" },
    { variants: ["tyr"], canonical: "tire" },
    { variants: ["lyf"], canonical: "life" },
    { variants: ["ryt"], canonical: "right" },
    { variants: ["alryt"], canonical: "alright" },
    { variants: ["fyt"], canonical: "fight" },
    { variants: ["fyn"], canonical: "fine" },
    { variants: ["lyt"], canonical: "light" },
    { variants: ["lyk"], canonical: "like" },
    { variants: ["giv"], canonical: "give" },
    { variants: ["mke", "mk"], canonical: "make" },
    { variants: ["4give", "4giv", "4gve", "4gv"], canonical: "forgive" },
    { variants: ["4givng", "4gvng"], canonical: "forgiving" },
    { variants: ["4got"], canonical: "forgot" },
    { variants: ["4get", "4gt", "4g8"], canonical: "forget" },
    { variants: ["4getng", "4gtng", "4g8ng"], canonical: "forgetting" },
    { variants: ["ofs", "ofis"], canonical: "office" },
    { variants: ["haus"], canonical: "house" },
    { variants: ["slep"], canonical: "sleep" },
    { variants: ["flyt"], canonical: "flight" },
    { variants: ["bryt"], canonical: "bright" },
    { variants: ["hyt"], canonical: "height" },
    { variants: ["hapy", "hapi"], canonical: "happy" },
    { variants: ["mor"], canonical: "more" },
    { variants: ["mny"], canonical: "many" },
    { variants: ["mch"], canonical: "much" },
    { variants: ["pls", "plz"], canonical: "please" },
    { variants: ["sz"], canonical: "size" },
    { variants: ["tanx", "tnx", "ty"], canonical: "thanks" },
    { variants: ["thnk"], canonical: "think" },
    { variants: ["tut"], canonical: "thought" },
    { variants: ["yup", "yeah", "yep", "ya", "aye"], canonical: "yes" },
    { variants: ["knw"], canonical: "know" },
    { variants: ["4ever", "4evr"], canonical: "forever" },
    { variants: ["fnd"], canonical: "find" },
    { variants: ["sory", "sry"], canonical: "sorry" },
    { variants: ["xtra"], canonical: "extra" },
    { variants: ["xcuz"], canonical: "excuse" },
    { variants: ["realy"], canonical: "really" },
    { variants: ["nop"], canonical: "no" },
    { variants: ["non"], canonical: "none" },
    { variants: ["tru"], canonical: "true" },
    { variants: ["da"], canonical: "the" },
    { variants: ["felngs"], canonical: "feelings" },
    { variants: ["felng"], canonical: "feeling" },
    { variants: ["fel"], canonical: "feel" },
    { variants: ["wel"], canonical: "well" },
    { variants: ["hav"], canonical: "have" },
    { variants: ["luv"], canonical: "love" },
    { variants: ["luvng"], canonical: "loving" },
    { variants: ["in luv", "inluv", "nluv"], canonical: "in love" },
    { variants: ["i've"], canonical: "i have" },
    { variants: ["wer"], canonical: "where" },
    { variants: ["wen"], canonical: "when" },
    { variants: ["whch"], canonical: "which" },
    { variants: ["fren"], canonical: "friend" },
    { variants: ["mom", "mum", "mommy", "ermatz"], canonical: "mother" },
    { variants: ["dad", "erfatz"], canonical: "father" },
    { variants: ["sis"], canonical: "sister" },
    { variants: ["bro"], canonical: "brother" },
    { variants: ["wyf"], canonical: "wife" },
    { variants: ["hubby"], canonical: "husband" },
    { variants: ["k", "ok", "oky", "okidoki"], canonical: "okay" },
    { variants: ["omg", "o.m.g."], canonical: "oh my god" },
    { variants: ["bwt", "bout"], canonical: "about" },
    { variants: ["sumtyms"], canonical: "sometimes" }
  ];

  // presets/beyondai.js
  var SITE = "https://beyondai.ph";
  var BEYOND_AI = {
    name: "Beyond AI",
    email: "sakib@beyondai.ph",
    // Published contact number on the new BeyondAi website.
    phone: "+44 7512 549837",
    phoneHref: "tel:+447512549837",
    contactPage: `${SITE}/contact`,
    linkedin: "https://www.linkedin.com/company/beyond_ai.manila/",
    facebook: "https://www.facebook.com/share/1DHSg7tWwR/"
  };
  var MAIL = `[${BEYOND_AI.email}](mailto:${BEYOND_AI.email})`;
  var CONTACT = `[contact page](${BEYOND_AI.contactPage})`;
  var CALL = BEYOND_AI.phone ? ` or call [${BEYOND_AI.phone}](${BEYOND_AI.phoneHref})` : "";
  var REACH = `email ${MAIL}${CALL}, or use the ${CONTACT} (the team aims to reply within 24 hours)`;
  var CONTACT_US = { label: "Contact Beyond AI", href: BEYOND_AI.contactPage };
  var ASK = (label, ask = label) => ({ label, ask });
  var PAGE = (label, path) => ({ label, href: `${SITE}${path}` });
  var MAIN_ACTIONS = [ASK("What services do you offer?"), ASK("Tell me about your products"), ASK("AI Education course"), CONTACT_US];
  var BEYOND_AI_KNOWLEDGE = [
    // ---------- small talk the site must handle well ----------
    {
      id: "greeting",
      smallTalk: true,
      brief: "Hi!",
      keys: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy", "hello po", "hi po"],
      answer: "{timeGreeting} I'm {botName}, Beyond AI's assistant. Ask me about our AI, cloud and cybersecurity services, our products, or the AI Education course.",
      actions: MAIN_ACTIONS
    },
    {
      id: "thanks",
      smallTalk: true,
      brief: "You're welcome!",
      keys: ["thanks", "thank you", "salamat", "salamat po", "maraming salamat", "appreciate it", "much appreciated", "thank you for listening", "thanks for listening"],
      answers: ["You're very welcome! 😊 Is there anything else I can help you with?", "Walang anuman! I'm always happy to help. 😊", "Anytime! It's my pleasure. 😊"],
      closing: "And thank you for sharing all of this with me. I'm always here to listen. 💛",
      actions: MAIN_ACTIONS
    },
    {
      id: "bye",
      smallTalk: true,
      keys: ["bye", "goodbye", "see you", "that is all", "thats all"],
      answer: `Thanks for stopping by! When you're ready, ${REACH}.`,
      actions: [CONTACT_US]
    },
    {
      id: "bot",
      title: "who you're talking to",
      keys: ["are you a bot", "are you human", "are you real", "are you ai", "who am i talking to", "chatbot", "robot", "who made you", "who built you", "who created you"],
      answer: "I'm {botName}, Beyond AI's automated assistant. I run right here in your browser and answer common questions about Beyond AI. For anything specific to your business, the team is happy to talk with you directly.",
      actions: [CONTACT_US]
    },
    {
      id: "help",
      title: "how I can help",
      keys: ["can you help me", "can you help", "i need help", "help me", "help", "please help", "i need assistance", "assist me"],
      answer: "Of course, I'd be happy to help! I can tell you about Beyond AI's services (AI, cloud, cybersecurity, software, managed IT and skilled professionals), our products (HRM, ERP, Count Trust, Agentic AI, Talkora AI), or our AI Education course, and connect you with the team.\n\nWhat would you like help with?",
      actions: MAIN_ACTIONS
    },
    // ---------- company ----------
    {
      id: "about",
      title: "who we are",
      keys: ["who are you", "about you", "about beyond ai", "what is beyond ai", "who is beyond ai", "beyond ai", "beyondai", "your company", "tell me about beyond ai", "what do you do", "company"],
      answer: "**Beyond AI** is based in **Clark, Philippines**, delivering AI, cloud, cybersecurity and enterprise software. It offers five products, six service pillars and practical AI education. Its cloud solutions span Microsoft Azure, AWS and Google Cloud.",
      actions: [ASK("What services do you offer?"), ASK("Why Beyond AI?"), PAGE("Visit beyondai.ph", "/")]
    },
    {
      id: "why",
      title: "why Beyond AI",
      keys: ["why beyond ai", "why choose", "why should", "different", "difference", "benefits", "advantages", "better than", "competitors", "trust you"],
      answer: "Beyond AI builds its own products, designs security into its services and selects cloud platforms to fit each project. Teams can combine software, cloud, managed IT and AI education around their needs.",
      actions: [ASK("How do you work?"), CONTACT_US]
    },
    {
      id: "locations",
      title: "where we are",
      keys: ["where are you", "where are you located", "located", "location", "offices", "office", "address", "where are you based", "countries", "headquarters", "hq"],
      answer: "Beyond AI is based in **Clark, Central Luzon, Philippines**, serving Metro Manila, the Philippines and international clients. Meetings use Philippine Standard Time (UTC+8, Asia/Manila). It's {hubTime} there now.",
      actions: [CONTACT_US]
    },
    {
      id: "leadership",
      title: "our leadership",
      keys: ["leadership", "board", "board of directors", "directors", "president", "ceo", "founder", "owner", "who runs", "management team", "executive team", "executives", "leadership team"],
      answer: "Beyond AI's leadership includes **Ronald Vergara, President**, **MD Naimul Hasan Durjay, Deputy Director**, and **Christopher French**, VALRPro co-founder.\n\nBoard members: **Muhammad Monir Hossain**, **Stacey Michelon** and **Abdulgani Macatoman**.",
      actions: [PAGE("Board of directors", "/board-of-directors")]
    },
    {
      id: "compliance",
      title: "certifications and partners",
      keys: ["iso", "iso 27001", "soc 2", "soc2", "cmmi", "certified", "certification", "certifications", "compliance", "compliant", "partner", "partners", "microsoft", "aws", "google cloud", "azure"],
      answer: "Beyond AI designs for security, responsible data handling and compliance requirements. Its cloud work spans **Microsoft Azure, AWS and Google Cloud**. Ask the team for current certification evidence and project-specific requirements.",
      actions: [ASK("Cyber Security"), CONTACT_US]
    },
    // Company data reviewed against beyondai.ph on 2026-10-20.
    {"id": "ronald-vergara", "title": "Ronald Vergara", "keys": ["ronald vergara", "ronald"], "answer": "**Ronald Vergara — President.** Founder of Beyond-AI.io and co-founder and CMO of VALRPro; works on AI automation, agentic systems and enterprise web solutions.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    {"id": "naimul-durjay", "title": "MD Naimul Hasan Durjay", "keys": ["md naimul hasan durjay", "naimul hasan", "naimul", "durjay", "deputy director"], "answer": "**MD Naimul Hasan Durjay — Deputy Director.** Oversees IT operations, product execution and sales strategy.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    {"id": "monir-hossain", "title": "Muhammad Monir Hossain", "keys": ["muhammad monir hossain", "mohammad monir hossain", "monir", "hossain", "betopia"], "answer": "**Muhammad Monir Hossain — Board member.** Founder and Chairman of Betopia Group.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    {"id": "stacey-michelon", "title": "Stacey Michelon", "keys": ["stacey michelon", "stacey", "michelon"], "answer": "**Stacey Michelon — Board member.** Founder of Veterans Advocate Center and co-founder of VALRPro; hosts the “You Served, You Deserve” podcast.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    {"id": "christopher-french", "title": "Christopher French", "keys": ["christopher french", "chris french", "christopher"], "answer": "**Christopher French — Executive team.** VALRPro co-founder, former serviceman and veteran advocate.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    {"id": "abdulgani-macatoman", "title": "Abdulgani Macatoman", "keys": ["abdulgani macatoman", "abdulgani", "macatoman"], "answer": "**Abdulgani Macatoman — Board member.** Former DTI Undersecretary and former Acting Secretary of the Commission on Filipinos Overseas.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    {"id": "governance", "title": "governance principles", "keys": ["governance", "governance policy", "governance principles"], "answer": "Beyond AI emphasizes innovation, client needs, quality, transparency, data security and sustainable growth.", "actions": [{"label": "Leadership & board", "href": "https://beyondai.ph/board-of-directors"}]},
    // ---------- services ----------
    {
      id: "services",
      title: "our services",
      overview: true,
      keys: ["services", "service", "offer", "what can you do", "what do you know", "how can you help", "what are you for", "what are you good at", "your capabilities", "what do you offer", "solutions", "help with", "our services"],
      answer: "Beyond AI offers six services: **Cloud Modernization**, **AI & Analytics**, **Cybersecurity & Compliance**, **Software Development**, **Managed Services** and **Resource Augmentation**. Which area would you like to explore?",
      actions: [ASK("AI & Analytics"), ASK("Cloud Services"), ASK("Cyber Security"), ASK("Software Development")]
    },
    {
      id: "cloud",
      title: "Cloud Modernization",
      keys: ["cloud", "cloud services", "cloud migration", "migrate", "migration", "multi cloud", "multicloud", "serverless", "infrastructure", "hosting", "cloud modernization"],
      answer: "**Cloud Modernization** covers cloud migration, multi-cloud management and infrastructure design across Microsoft Azure, AWS and Google Cloud. Ask the team about your infrastructure and migration goals.",
      actions: [PAGE("See services", "/services"), CONTACT_US]
    },
    {
      id: "ai",
      title: "AI & Analytics",
      keys: ["ai and analytics", "ai analytics", "analytics", "machine learning", "ml", "nlp", "natural language processing", "computer vision", "data science", "ai solution", "ai solutions", "ai services", "ai development", "build ai", "predictive", "ai model", "ai models", "llm", "generative ai", "ai for my business", "use ai"],
      answer: "**AI & Analytics:** we build AI that fits your business, including:\n- Machine learning models\n- Natural language processing\n- Computer vision solutions\n\nWe also offer ready-made AI products like **Beyond AI Agentic AI** (sales automation) and **Talkora AI** (voice automation).",
      actions: [ASK("Agentic AI"), ASK("Talkora AI"), CONTACT_US]
    },
    {
      id: "security",
      title: "Cybersecurity & Compliance",
      keys: ["cybersecurity and compliance", "cybersecurity compliance", "cyber security", "cybersecurity", "security", "secure", "soc", "penetration testing", "pen test", "pentest", "threat intelligence", "hacked", "breach", "ransomware", "phishing", "malware", "vulnerability", "audit", "endpoint"],
      answer: "**Cybersecurity & Compliance:** security monitoring, penetration testing, threat intelligence, incident response and compliance support. Contact the team to define the systems, controls and coverage you need.",
      actions: [PAGE("See services", "/services"), CONTACT_US]
    },
    {
      id: "software",
      title: "Software Development",
      keys: ["software development", "develop", "developer", "build an app", "build a website", "app development", "mobile app", "ios", "android", "web app", "web application", "website", "custom software", "enterprise software", "app idea", "build"],
      answer: "**Software Development:** custom web, mobile and enterprise applications, from planning to deployment. The portfolio lists **22 apps and 10 websites**, including Prime Pilates, SwiftSwap and Dudu Car Malaysia.",
      actions: [ASK("Show me your work"), CONTACT_US]
    },
    {
      id: "managed",
      title: "Managed Services",
      keys: ["managed services", "managed it", "it support", "helpdesk", "help desk", "it helpdesk", "monitoring", "server", "servers", "network", "network management", "it department", "outsource it"],
      answer: "**Managed Services:** we keep your IT running, with:\n- 24/7 infrastructure monitoring\n- IT helpdesk and end-user support\n- Server and network management",
      actions: [PAGE("See services", "/services"), CONTACT_US]
    },
    {
      id: "augmentation",
      title: "Resource Augmentation",
      keys: ["resource augmentation", "staff augmentation", "augmentation", "hire developers", "need developers", "dedicated developers", "dedicated team", "engineers", "outsourcing", "outsource", "offshore", "skilled professionals", "it staff", "remote developers"],
      answer: "**Resource Augmentation:** add skilled people to your team without the hiring overhead:\n- Dedicated IT and engineering resources\n- On-demand skilled professionals\n- Short-term and long-term engagement models",
      actions: [PAGE("See services", "/services"), CONTACT_US]
    },
    // ---------- products ----------
    {
      id: "products",
      title: "our products",
      overview: true,
      keys: ["products", "product", "software products", "platforms", "tools", "your software", "saas"],
      answer: "Beyond AI offers five products:\n- **HRM Software:** employee information and HR workflows\n- **ERP:** connected business operations\n- **Count Trust:** organizational elections\n- **Talkora AI:** business call automation\n- **Agentic AI:** sales and customer engagement automation\n\nAsk the team for a product walkthrough.",
      actions: [ASK("Beyond AI HRM"), ASK("Talkora AI"), ASK("Agentic AI"), PAGE("See products", "/products")]
    },
    {
      id: "hrm",
      title: "Beyond AI HRM",
      keys: ["tell me about hrm", "beyond ai hrm", "what is hrm", "hrm", "hr software", "hr system", "human resources", "payroll", "attendance", "leave management", "employee database", "performance reviews", "recruitment", "onboarding software", "hris"],
      answer: "**Beyond AI HRM Software** brings employee records, attendance, leave, payroll preparation and performance into one secure system. Ask for a demo tailored to your HR workflow.",
      actions: [PAGE("See products", "/products"), CONTACT_US]
    },
    {
      id: "erp",
      title: "Beyond AI ERP",
      keys: ["tell me about erp", "beyond ai erp", "what is erp", "erp", "enterprise resource planning", "inventory", "accounting system", "operations system"],
      answer: "**Beyond AI ERP** uses the **Odoo framework** to connect business operations. It supports synchronized data, configurable workflows and reports, mobile access and role-based controls.",
      actions: [PAGE("See products", "/products"), CONTACT_US]
    },
    {
      id: "count-trust",
      title: "Beyond AI Count Trust",
      keys: ["count trust", "counttrust", "voting", "vote", "election", "elections", "ballot", "polling"],
      answer: "**Beyond AI Count Trust** supports organizational elections, from registering voters to publishing transparent live results. Ask the team to demonstrate it for your voting process.",
      actions: [PAGE("See products", "/products"), CONTACT_US]
    },
    {
      id: "agentic",
      title: "Beyond AI Agentic AI",
      keys: ["agentic", "agentic ai", "ai agent", "ai agents", "sales automation", "automate sales", "negotiation", "sales ai", "automation", "automate"],
      answer: "**Beyond AI Agentic AI** automates sales, negotiation and customer engagement, including first contact and follow-up. Ask for a walkthrough using your sales workflow.",
      actions: [PAGE("See products", "/products"), CONTACT_US]
    },
    {
      id: "talkora",
      title: "Talkora AI",
      keys: ["talkora", "voice ai", "voice automation", "voice bot", "phone bot", "answer calls", "answering calls", "call answering", "receptionist", "ivr", "too many calls", "missed calls"],
      answer: "**Talkora AI** is a voice assistant that answers, understands and manages business calls around the clock. Contact the team for a demonstration.",
      actions: [PAGE("See products", "/products"), CONTACT_US]
    },
    {
      id: "trial",
      title: "free trial",
      keys: ["free trial", "trial", "try it", "demo", "test it", "try your product"],
      answer: "Contact Beyond AI to request a product demo and confirm current trial availability, eligibility and terms.",
      actions: [CONTACT_US, PAGE("See products", "/products")]
    },
    {
      id: "integrations",
      title: "integrations and uptime",
      keys: ["integrations", "integrate", "integration", "api", "uptime", "sla", "encryption", "reliability", "availability"],
      answer: "Beyond AI can discuss product integration, hosting and support requirements. Ask the team to confirm supported APIs, integration options, encryption controls and any uptime SLA for the product and plan you need.",
      actions: [PAGE("See products", "/products"), CONTACT_US]
    },
    // ---------- AI Education ----------
    {
      id: "education",
      title: "the AI Education course",
      skipIf: ["learn-ai", "enroll", "certificate"],
      keys: ["ai education", "ai course", "ai class", "ai training", "course", "courses", "class", "classes", "training", "learn ai", "study ai", "bootcamp", "curriculum", "syllabus", "modules", "lessons", "no coding"],
      answer: "**AI Education: no coding required.** 11 comprehensive modules, 4 real-world projects and a certificate of completion, with zero coding experience needed.\n\nYou'll cover machine learning, deep learning, NLP, LLMs, generative AI and AI agents, plus responsible AI (bias, privacy and safe use). Projects:\n- A prompt system with an evaluation checklist\n- A text classification demo\n- A knowledge Q&A prototype (RAG)\n- Capstone: an agent-style workflow (plan, execute, verify, report)\n\nIt's designed for students and graduates, professionals in any field, career switchers, managers and founders, and creators and marketers.",
      actions: [{ label: "Get started", href: `${SITE}/ai-education` }, ASK("How do I enroll?")]
    },
    {
      id: "enroll",
      title: "enrolling in the course",
      keys: ["enroll", "enrol", "enrollment", "sign up for the course", "join the course", "register", "registration", "how much is the course", "course fee", "tuition", "schedule of classes", "when does the course start", "course schedule", "class schedule", "weekend classes", "weekend class", "evening classes", "online classes", "is it online", "face to face", "how long is the course", "course duration"],
      answer: "Ask Beyond AI about the next AI Education intake, fees, course format and full syllabus through the contact page or sakib@beyondai.ph.",
      actions: [CONTACT_US]
    },
    {
      id: "certificate",
      title: "the course certificate",
      keys: ["certificate", "certification course", "certified course", "do i get a certificate"],
      answer: "Yes. The **certificate of completion** is awarded after you finish all assessments and the final capstone project.",
      actions: [ASK("How do I enroll?")]
    },
    {
      id: "corporate-training",
      title: "team training",
      keys: ["corporate training", "team training", "train my team", "train our team", "train employees", "workshop", "upskill", "upskilling"],
      answer: "Beyond AI offers team AI training. Tell the team your group size, goals and preferred schedule through the contact page or sakib@beyondai.ph.",
      actions: [CONTACT_US]
    },
    // ---------- working with Beyond AI ----------
    {
      id: "process",
      title: "how we work",
      keys: ["how do you work", "how does it work", "how it works", "process", "steps", "get started", "getting started", "onboarding", "next steps", "what happens", "methodology", "approach"],
      answer: "Beyond AI follows six delivery steps: **Discovery and consultation \u2192 Strategy and roadmap \u2192 Design and architecture \u2192 Build and implement \u2192 Test and validate \u2192 Launch and optimize**. The team defines requirements, timelines and success measures with you.",
      actions: [CONTACT_US]
    },
    {
      id: "pricing",
      title: "pricing",
      keys: ["price", "prices", "pricing", "cost", "costs", "how much", "rates", "rate", "fees", "fee", "budget", "quote", "quotation", "expensive", "cheap", "affordable", "monthly", "per hour", "hourly", "subscription", "plans"],
      answer: "Contact Beyond AI for a quote based on your scope, product and support needs. Ask the team to confirm current pricing and plan terms.",
      actions: [CONTACT_US, ASK("How do you work?")]
    },
    {
      id: "timeline",
      title: "timelines",
      keys: ["how long", "timeline", "how fast", "how soon", "when can you start", "deadline", "turnaround", "duration"],
      answer: "Project timing depends on scope. Beyond AI starts with discovery, then agrees a roadmap, timeline and measurable goals. Contact the team with your requirements and preferred launch date.",
      actions: [ASK("How do you work?"), CONTACT_US]
    },
    {
      id: "portfolio",
      title: "our work",
      keys: ["portfolio", "your work", "show me your work", "previous work", "past projects", "case studies", "case study", "examples", "clients", "apps you built", "references", "projects"],
      answer: "Beyond AI lists **32 portfolio projects: 22 apps and 10 websites**. Examples include VALRPRO, Prime Pilates, SwiftSwap, Dudu Car Malaysia and My Tracks, plus websites for Kitfix, Veralosso, Bloomvits and Dermexia. Some projects have live store links; others show that a listing is unavailable.",
      actions: [PAGE("See our work", "/portfolio"), CONTACT_US]
    },
    {
      id: "results",
      title: "results",
      keys: ["results", "roi", "return on investment", "save money", "cost reduction", "faster", "efficiency", "outcomes"],
      answer: "Beyond AI agrees project goals and measurable KPIs during discovery and planning. Ask the team for relevant case studies and expected outcomes for your requirements.",
      actions: [CONTACT_US]
    },
    {
      id: "support",
      title: "support",
      keys: ["technical support", "tech support", "customer support", "24 7", "24/7", "help desk support", "support team", "report a bug", "your product is not working"],
      answer: "For technical support, contact Beyond AI through its contact page or sakib@beyondai.ph. Confirm the support coverage and response terms for your service or product.",
      actions: [CONTACT_US]
    },
    // ---------- AI and tech, in plain language (always tied back to how Beyond AI helps) ----------
    {
      id: "what-is-ai",
      title: "what AI is",
      keys: ["what is ai", "what is artificial intelligence", "explain ai", "how does ai work", "ai meaning", "define ai", "ano ang ai"],
      answer: "Great question! **Artificial intelligence (AI)** is software that learns patterns from data so it can do things that usually need human thinking: understanding language, recognising images, making predictions, or answering questions (like me!).\n\nBeyond AI builds AI for businesses, and our **AI Education** course teaches it from scratch, with no coding needed.",
      actions: [ASK("AI Education course", "Tell me about the AI course"), ASK("AI & Analytics")]
    },
    {
      id: "ai-jobs",
      title: "AI and jobs",
      keys: ["will ai take my job", "ai replace", "replace my job", "ai taking jobs", "is ai dangerous", "is ai safe", "should i be scared of ai", "afraid of ai", "ai is scary"],
      answer: "That's a really common worry, and a fair one. AI is changing many jobs, but the people who learn to work *with* AI are usually the ones who benefit most. It's best at repetitive tasks, which frees people for the creative and human parts of work.\n\nUsed responsibly (with attention to bias, privacy and safety), AI is a powerful helper. Our **AI Education** course covers exactly this, including responsible AI, with no coding required.",
      actions: [ASK("AI Education course", "Tell me about the AI course")]
    },
    {
      id: "learn-ai",
      title: "learning AI",
      keys: ["how to learn ai", "where to learn ai", "start learning ai", "learning ai", "learn machine learning", "learn ai without coding", "is ai hard to learn", "hard to learn", "difficult to learn", "easy to learn", "beginner ai", "ai for beginners"],
      answer: "You can absolutely learn AI, even without a tech background! A good path is: understand the basics (what models and data are), practise with real tools like prompting and simple projects, then build something small.\n\nOur **AI Education** course follows that path: 11 modules, 4 hands-on projects, a certificate, and zero coding needed.",
      actions: [{ label: "Get started", href: `${SITE}/ai-education` }, ASK("How do I enroll?")]
    },
    {
      id: "what-is-agent",
      title: "AI agents",
      keys: ["what is an ai agent", "what are ai agents", "what is agentic ai", "agentic meaning", "ai agent meaning"],
      answer: "An **AI agent** is AI that doesn't just answer questions: it can plan steps and take actions toward a goal, like following up with leads or handling a negotiation, then check its work and report back.\n\nThat's exactly what **Beyond AI Agentic AI** does for sales. Our AI Education course even has a capstone where you build an agent-style workflow!",
      actions: [ASK("Agentic AI"), ASK("AI Education course", "Tell me about the AI course")]
    },
    {
      id: "what-is-cloud",
      title: "what the cloud is",
      keys: ["what is the cloud", "what is cloud computing", "cloud meaning", "explain cloud", "why move to the cloud", "benefits of cloud"],
      answer: "**The cloud** means running your software and storing your data on secure, managed servers over the internet instead of machines in your office. You pay for what you use, scale up easily, and don't have to maintain hardware.\n\nBeyond AI helps with cloud migration and management across Microsoft, AWS and Google Cloud.",
      actions: [ASK("Cloud Services")]
    },
    {
      id: "stay-safe-online",
      title: "staying safe online",
      keys: ["how to stay safe online", "stay safe online", "safe online", "be safe online", "how do i stay safe", "online safety", "internet safety", "protect myself online", "password tips", "strong password", "how to avoid scams", "phishing email", "is this a scam", "got a suspicious email", "protect my account", "two factor"],
      answer: "Here are a few simple habits that stop most attacks:\n- Use a different, long password for each account, and a password manager\n- Turn on two-factor authentication wherever you can\n- Don't click links or open attachments in unexpected messages; check the sender first\n- Keep your phone and computer updated\n\nFor businesses, Beyond AI's **Cyber Security** team offers 24/7 monitoring, testing and threat intelligence.",
      actions: [ASK("Cyber Security")]
    },
    {
      id: "tech-trouble",
      title: "tech trouble",
      keys: ["my computer is slow", "computer is slow", "laptop is slow", "slow internet", "wifi is slow", "forgot my password", "my phone is slow", "my computer crashed", "virus on my computer"],
      answer: `Tech trouble is so annoying, I'm sorry! A few quick things to try: restart the device, install pending updates, close apps you're not using, and free up some storage. For a forgotten password, use the "Forgot password" link on the sign-in page.

For businesses, Beyond AI's **Managed Services** team provides 24/7 monitoring and IT helpdesk support, so issues like this get handled for you.`,
      actions: [ASK("Managed Services")]
    },
    {
      id: "grow-business",
      title: "growing a business",
      keys: ["how to grow my business", "grow my business", "get more customers", "more sales", "increase sales", "scale my business", "business tips", "start a business", "starting a business", "digital transformation"],
      answer: "Love that you're thinking about growth! A few things that help most businesses: know your best customers and serve them really well, automate the repetitive work, keep your data and systems secure, and use data to decide what to do next.\n\nThat's where Beyond AI comes in: AI and automation, cloud, cybersecurity and custom software. Tell me about your business and I'll suggest where to start!",
      actions: [ASK("What services do you offer?"), CONTACT_US]
    },
    {
      id: "chatbot-for-business",
      title: "a chatbot like me",
      keys: ["can you build a chatbot", "build a chatbot", "chatbot for my business", "ai chatbot", "virtual assistant for my business", "ai assistant for my website", "chatbot like you"],
      answer: "Yes! Beyond AI builds AI assistants and automation for businesses, from website chat like me to **Talkora AI** for phone calls and **Agentic AI** for sales. Tell me what you'd like it to do, and I'll point you to the team.",
      actions: [ASK("Talkora AI"), ASK("Agentic AI"), CONTACT_US]
    },
    // ---------- contact ----------
    {
      id: "contact",
      title: "how to reach us",
      keys: ["contact", "email", "e mail", "phone", "phone number", "call", "call you", "reach", "talk to someone", "talk to a person", "talk to a human", "human", "real person", "representative", "sales team", "speak to", "linkedin", "facebook", "social media"],
      answer: `You can ${REACH}. You'll also find us on [LinkedIn](${BEYOND_AI.linkedin}) and [Facebook](${BEYOND_AI.facebook}). It's {hubTime} in Clark, Philippines right now.`,
      actions: [CONTACT_US]
    },
    {
      id: "partnership",
      title: "partnerships",
      keys: ["partnership", "partner with you", "collaborate", "collaboration", "reseller", "affiliate", "joint venture", "investment", "invest"],
      answer: `We'd love to hear from you. Use the ${CONTACT} and choose **Partnership**, or email ${MAIL}.`,
      actions: [CONTACT_US]
    },
    {
      id: "careers",
      title: "jobs",
      keys: ["careers", "job openings", "open positions", "are you hiring", "hiring now", "jobs at beyond ai", "job at beyond ai", "work for you", "work for beyond ai", "work at beyond ai", "apply to beyond ai", "vacancy", "vacancies", "internship", "send my resume", "send my cv"],
      answer: `The website doesn't list open positions. To ask about opportunities, email ${MAIL} with the role you're interested in and your resume, or reach out on [LinkedIn](${BEYOND_AI.linkedin}).`
    }
  ];
  var VIA_GREETINGS = [
    "{timeGreeting} I'm {botName}, Beyond AI's assistant. Ask me anything about our AI, cloud and cybersecurity solutions.",
    "{timeGreeting} I'm {botName}. How can Beyond AI help your business today?"
  ];
  var VIA_FALLBACKS = [
    "I'm sorry, I didn't quite catch that, and I'd really like to help. Could you tell me a little more?",
    "Hmm, I'm not sure I understood, but I'm here for you. Could you say it another way?",
    `That one's a bit outside what I know, I'm sorry! The team would be happy to help: email ${MAIL}.`
  ];
  var SKIP_FALLBACK = /neighbors|relationship with yourself|start with yourself|So what do you do|something else about yourself|sorry about|favorite subject/i;
  var LIZA_FALLBACKS = FALLBACKS.filter((f) => !SKIP_FALLBACK.test(f));
  var VIA_SMALL_TALK = RESPONSES;
  var LIZA_TOPIC_IDS = [
    "rainbows",
    "quantum",
    "making-love",
    "how-old",
    "events",
    "annoying",
    "are-friends",
    "excited",
    "enraged",
    "you-must-learn",
    "bad-language",
    "funny",
    "smarter",
    "boring",
    "you-busy",
    "gods",
    "wow",
    "yourself",
    "designed-you",
    "chat",
    "your-name",
    "what-are-you",
    "frustrating",
    "nightmare",
    "fantasized",
    "curiosities",
    "do-you-remember",
    "forgetting",
    "difficulties",
    "problematic",
    "slowing",
    "stranger",
    "listening",
    "truth",
    "family",
    "companions",
    "male",
    "another-language",
    "understand",
    "sorry",
    "thanks",
    "welcome",
    "good-evening",
    "good-morning",
    "good-afternoon",
    "good-night",
    "hello",
    "see-you-next-time",
    "help-2",
    "botname",
    "username"
  ];
  var VIA_MOOD_LINES = {
    angry: ["I'm really sorry this has been so frustrating.", "I completely understand, and I'm sorry for the trouble.", "I'm sorry you've had to deal with this. Let's sort it out together."],
    distressed: ["I can tell this is stressful, and that's completely okay. Let's take it one step at a time.", "No pressure at all. We'll work through it together."],
    depressed: ["I'm so sorry you're going through a hard time.", "That sounds really tough. I'm here for you."],
    jolly: ["Haha, I love your energy! 😄", "You've made me smile! 😄"],
    happy: ["That's wonderful to hear! 😊", "I'm so glad!"]
  };
  var VIA_MOOD_PROMPTS = {
    angry: [`I'm here to help. Would you tell me what went wrong? I'll point you to the right place, or you can ${REACH}.`],
    distressed: ["What's weighing on you most right now? If it's a business problem, like security, systems, calls or hiring, I can show you how Beyond AI helps."],
    depressed: ["I'm here if you want to talk. And if there's anything I can help with, just ask."],
    jolly: ["What can I help you with today?"],
    happy: ["What can I help you with today?"]
  };
  var TALK = (label) => ({ label, ask: label });
  var BRIDGES = [
    {
      when: (t) => /\b(exam|exams|school|study|studying|student|teacher|teach|homework|thesis|graduat|career|job hunting|looking for a job|new skill|learn|course|bored)\b/.test(t),
      lines: [
        "If you want to build on that interest, Beyond AI offers a practical **AI Education** course with no coding needed.",
        "For learning something new, Beyond AI's beginner-friendly **AI Education** course is another option I can explain."
      ],
      actions: [TALK("Tell me about the AI course")]
    },
    {
      when: (t) => /\b(work|job|boss|overtime|busy|swamped|tired|exhausted|deadline|manual|spreadsheet|paperwork|repetitive|too much)\b/.test(t),
      lines: [
        "And if work has been piling up, Beyond AI builds AI tools that take repetitive tasks off people's plates, so there's more time for what matters.",
        "If it would help, I can share how Beyond AI uses automation to lighten the workload for teams like yours."
      ],
      actions: [TALK("How can AI help with my work?")]
    },
    {
      when: (t) => /\b(business|company|clients|customers|startup|shop|store|team|staff|employees|sales)\b/.test(t),
      lines: [
        "Whenever you'd like, tell me a bit about your business and I'll suggest where Beyond AI could help, whether that's AI, cloud, cybersecurity or our ready-made products."
      ],
      actions: [TALK("What services do you offer?")]
    },
    {
      when: (t) => /\b(phone|computer|laptop|hacked|password|scam|virus|internet|app|website|online)\b/.test(t),
      lines: [
        "Beyond AI also offers **Cyber Security** and **Managed Services** to help keep technology secure and running smoothly."
      ],
      actions: [TALK("Tell me about Cyber Security")]
    }
  ];
  var SOFT_BRIDGES = [
    "I'm also here to guide you through Beyond AI's products and services whenever you're ready. We can stay with what's on your mind for now.",
    "Beyond AI's products, services and AI Education course are here to explore at your pace; there's no need to change the subject right now.",
    "As Beyond AI's assistant, I can help with our products and services too. For now, let's give what you've shared the attention it deserves.",
    "If practical help with work or learning becomes useful, I can explain Beyond AI's services and AI Education course. We can take this conversation at your pace."
  ];
  var GENERAL_BRIDGES = [
    "Beyond AI offers practical ways to simplify work with AI, software and cloud services.",
    "For business operations, Beyond AI's products include HRM, ERP and Talkora AI.",
    "For learning something new, Beyond AI's AI Education course introduces practical AI without requiring coding.",
    "A project can start with one useful task; Beyond AI develops web, mobile and enterprise software.",
    "Beyond AI combines business products, technology services and practical AI education for different needs."
  ];
  function viaBridge({ text, mood, used, random, concern, alignment, listening, turn, source }) {
    // A useful conversation leads the introduction: understand, relate, explain,
    // then offer a next step. Memory questions are answered without a sales detour.
    if (source === "memory" || !turn) return null;
    const low = ["depressed", "distressed", "angry"].includes(mood);
    const ready = /\b(?:what can help|what next|next step|how can (?:you|beyond ai) help|what (?:do you|does beyond ai) offer|tell me (?:about|more)|interested|show me|recommend|suggest|what should i do|learn more)\b/.test(text);
    if (listening.noAdvice || low && !ready) return null;
    if (turn - alignment.lastTurn < 2 && !ready) return null;
    const service = concern && concern.service;
    const options = {
      work: [
        "Since you mentioned your workload, Beyond AI helps teams use AI and automation to reduce repetitive work.",
        "Beyond AI's AI & Analytics and Software Development services are relevant options for the repetitive tasks you described.",
        "If you'd like to explore this with Beyond AI, we can start by outlining the task, how often you do it, and the result you need."
      ],
      learning: [
        "That learning goal connects with what Beyond AI offers through its AI Education course.",
        "Beyond AI's beginner-friendly AI Education course covers practical AI without requiring coding. I can explain what's included.",
        "When you're ready, I can help you prepare your questions about Beyond AI's AI Education course and point you to the team."
      ],
      security: [
        "The security concern you mentioned is one area Beyond AI's Cyber Security services focus on.",
        "Beyond AI offers Cyber Security services including monitoring, penetration testing and threat intelligence. The right fit depends on what you need protected.",
        "If you'd like the Beyond AI team to look at your requirements, we can outline the systems involved and the support you're looking for."
      ],
      software: [
        "The software need you described connects with Beyond AI's work building web, mobile and enterprise applications.",
        "Beyond AI's Software Development services may fit that need. We can narrow it down by the users, the main task and the features that matter most.",
        "A useful next step with Beyond AI would be a short project brief. I can help you put your needs into words for the team."
      ],
      business: [
        "Beyond AI offers products and services for business operations, so there may be a useful connection to the needs you've shared.",
        "Beyond AI's options include HRM for human resources, ERP for business operations and Talkora AI for business calls. We can focus on the part of your business that needs help.",
        "If an option sounds relevant, I can help you prepare your requirements and find the right Beyond AI contact."
      ]
    };
    if (service && options[service]) {
      const continuing = alignment.service === service;
      const stage = continuing ? Math.min(3, alignment.stage + 1) : ready ? 2 : 1;
      const asks = {work: "Tell me about AI & Analytics", learning: "Tell me about the AI course", security: "Tell me about Cyber Security", software: "Tell me about Software Development", business: "Tell me about your products"};
      return {text: options[service][stage - 1], stage, service,
        actions: stage === 3 ? [CONTACT_US] : [{label: stage === 1 ? "Explore relevant options" : "See service details", ask: asks[service]}]};
    }
    // Casual conversation gets an occasional light introduction; don't attach
    // the same product pitch to every emotional or unrelated message.
    if (low || turn < 3 || turn - alignment.lastTurn < 4 || alignment.stage >= 2) return null;
    const fresh = GENERAL_BRIDGES.filter(line => !used.has(line));
    const line = pick2(fresh.length ? fresh : GENERAL_BRIDGES, random);
    return line ? {text: line, stage: 1, actions: [{label: "Explore Beyond AI", ask: "What can Beyond AI do?"}]} : null;
  }
  function pick2(list, random) {
    return list.length ? list[Math.floor(random() * list.length)] : void 0;
  }
  var NEED_LABELS = {
    cloud: "Cloud Services",
    ai: "AI & Analytics",
    security: "Cyber Security",
    software: "Software Development",
    managed: "Managed Services",
    augmentation: "Resource Augmentation",
    hrm: "Beyond AI HRM",
    erp: "Beyond AI ERP",
    "count-trust": "Beyond AI Count Trust",
    agentic: "Beyond AI Agentic AI",
    talkora: "Talkora AI",
    education: "the AI Education course",
    "corporate-training": "team AI training"
  };
  var STARTING_POINT = {
    "hotels and hospitality": "talkora",
    "e-commerce": "agentic",
    retail: "agentic",
    "real estate": "agentic",
    "property management": "erp",
    insurance: "security",
    "financial services": "security",
    "healthcare administration": "security",
    technology: "augmentation",
    "professional services": "hrm",
    "home services": "talkora",
    travel: "talkora",
    logistics: "erp",
    education: "corporate-training",
    government: "count-trust",
    "non-profit": "count-trust",
    manufacturing: "erp",
    "BPO and call centers": "hrm"
  };
  var PAIN_FIT = {
    "security worries": "security",
    "old systems": "cloud",
    "manual work": "agentic",
    "HR and payroll headaches": "hrm",
    "too many calls": "talkora",
    "slow responses": "talkora",
    "skills gap": "education",
    "hiring is hard": "augmentation",
    "too much work": "augmentation",
    "staff turnover": "hrm",
    "high costs": "cloud"
  };
  function emailWithSummary(facts) {
    const subject = encodeURIComponent("Enquiry from the Beyond AI website");
    const body = encodeURIComponent(`Hi Beyond AI team,

Here's a summary from my chat with Via:
- ${facts.join("\n- ")}

Please get in touch.
`);
    return `mailto:${BEYOND_AI.email}?subject=${subject}&body=${body}`;
  }
  function viaAdvice(profile, { shownIds, given }) {
    var _a, _b, _c;
    const facts = describeProfile(profile, NEED_LABELS);
    const ready = profile.buying || profile.timeline || shownIds.some((id) => id === "pricing" || id === "trial" || id === "contact");
    if (ready && facts.length >= 2 && !given.has("summary")) {
      return {
        key: "summary",
        text: `Here's what I've noted for the team: ${facts.join("; ")}. Send it with one click below, or mention it on the contact form, and you won't need to repeat yourself.`,
        actions: [{ label: "Email this summary", href: emailWithSummary(facts) }, CONTACT_US]
      };
    }
    for (const pain of (_a = profile.pains) != null ? _a : []) {
      const fit = PAIN_FIT[pain];
      if (fit && !given.has(`fit:${fit}`) && !shownIds.includes(fit) && !((_b = profile.needs) == null ? void 0 : _b.includes(fit))) {
        return {
          key: `fit:${fit}`,
          text: `Since you mentioned ${pain}, **${NEED_LABELS[fit]}** could help there.`,
          actions: [ASK(`About ${NEED_LABELS[fit].replace(/^the /, "")}`, `Tell me about ${NEED_LABELS[fit].replace(/^the /, "")}`)]
        };
      }
    }
    const start2 = STARTING_POINT[profile.industry];
    if (profile.business && start2 && !((_c = profile.needs) == null ? void 0 : _c.includes(start2)) && !given.has(`fit:${start2}`) && !shownIds.includes(start2)) {
      return {
        key: `fit:${start2}`,
        text: `For ${/^[aeiou]/i.test(profile.business) ? "an" : "a"} ${profile.business} like yours, **${NEED_LABELS[start2]}** is often a good place to start.`,
        actions: [ASK(`About ${NEED_LABELS[start2].replace(/^the /, "")}`, `Tell me about ${NEED_LABELS[start2].replace(/^the /, "")}`)]
      };
    }
    return null;
  }
  // Astrix Nova + Physics 0.4.0 knowledge from both supplied READMEs.
  // Current artificial-life build summary takes precedence over older changelog notes.
  var ASTRIX_NOVA_KNOWLEDGE = [
  {
    "id": "astrix-overview",
    "title": "Astrix Nova + Physics",
    "keys": [
      "astrix",
      "nova",
      "physics",
      "astrix nova",
      "astrix nova physics",
      "beyond ai engine",
      "3d engine",
      "game engine",
      "physics engine"
    ],
    "answer": "**Beyond AI — Astrix Nova + Physics 0.4.0** is a performance-first browser 3D engine suite. **Astrix** is the shared brand: **Astrix Nova** renders with native WebGPU and **Astrix Physics** simulates with custom JavaScript physics. Beyond AI procedural lifeforms add walking characters and vehicle riding.\n\nPhysics, rendering and heavy asset decoding use separate workers. The organized release is `astrix-nova-physics-source-0.4.0.zip`, with top-level folder `astrix-nova-physics/`. Sources, examples and build scripts are JavaScript, with no TypeScript compilation step. Local packages, models and decoders are included; the core has no CDN or external npm runtime dependency. Optional YouTube embeds require internet access.\n\nExamples use generated minified engines and shared helpers from `build/`, while their application JavaScript and HTML remain readable and commented. Reorganization/minification does not intentionally change controls, physics, audio, lifeform motion or rendering.",
    "engine": true,
    "actions": [
      {
        "label": "How do I run Astrix Nova?",
        "ask": "How do I run Astrix Nova?"
      },
      {
        "label": "Astrix racetrack demo",
        "ask": "Astrix racetrack demo"
      },
      {
        "label": "Astrix performance budgets",
        "ask": "Astrix performance budgets"
      }
    ],
    "overview": true,
    "skipIf": [
      "astrix-setup",
      "astrix-install",
      "astrix-demos",
      "astrix-racetrack",
      "astrix-riding",
      "astrix-controls",
      "astrix-brake",
      "astrix-camera",
      "astrix-vehicles",
      "astrix-grip",
      "astrix-aircraft",
      "astrix-lifeforms",
      "astrix-posture",
      "astrix-crowds",
      "astrix-physics",
      "astrix-rendering",
      "astrix-environment",
      "astrix-skids",
      "astrix-water",
      "astrix-performance",
      "astrix-streaming",
      "astrix-minimal",
      "astrix-limits",
      "astrix-validation",
      "astrix-docs",
      "astrix-youtube",
      "astrix-audio",
      "astrix-headlights",
      "astrix-dust",
      "astrix-coasting",
      "astrix-recovery",
      "astrix-virtual-experience-engine"
    ]
  },
  {
    "id": "astrix-setup",
    "title": "engine setup",
    "keys": [
      "quick start",
      "setup",
      "set up",
      "run astrix",
      "run nova",
      "how to run",
      "npm start",
      "localhost",
      "requirements",
      "webgpu support",
      "file protocol",
      "start astrix",
      "start nova",
      "run astrix",
      "run nova",
      "node version",
      "node js",
      "node 24",
      "quick start"
    ],
    "answer": "**Run the bundled engine:**\n- Use **Node.js 24 or newer**.\n- Extract `astrix-nova-physics-source-0.4.0.zip` and open a terminal inside `astrix-nova-physics/`.\n- Run `npm start`. The ZIP includes its generated build; dependency installation and compilation are not needed to run the bundled server.\n- Open `http://localhost:8080/racetrack.html`. The server binds to `127.0.0.1:8080`; `PORT` changes its port. The root URL redirects to the uniform viewer.\n\nUse a browser/device with WebGPU, Web Workers and transferable OffscreenCanvas. Serve through localhost or HTTPS; `file://` will not work correctly. Rebuild explicitly after source edits; startup/play does not compile the engine.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix demos",
        "ask": "Astrix demos"
      },
      {
        "label": "Install Astrix packages",
        "ask": "Install Astrix packages"
      }
    ]
  },
  {
    "id": "astrix-install",
    "title": "local packages",
    "keys": [
      "install",
      "installation",
      "npm install",
      "offline packages",
      "package imports",
      "import maps",
      "bundler",
      "wasm paths"
    ],
    "answer": "**Use Astrix Nova + Physics in another project:**\nBrowser imports from the generated build:\n```js\nimport Nova from './build/Nova/nova.min.js';\nimport Physics from './build/Physics/physics.min.js';\n```\nKeep `build/Nova/`, `build/Physics/` and `build/Shared/` together, preserving relative module, worker, decoder, WASM and Dunes-resource URLs. `build/manifest.json` records runtime entry points.\n\nFor separate packages, first run `npm run pack:offline` to generate and verify the two tarballs in `npm/`, then:\n```sh\nnpm install --offline --ignore-scripts ./npm/astrix-physics-0.4.0.tgz ./npm/astrix-nova-0.4.0.tgz\n```\nPackage default imports remain compatible with `astrix-physics` and `astrix-nova`. Packages contain minified runtime and source; the Physics source API retains the compatible `Astrix` export. Browser import maps can target generated API entries. Serve `.js`/`.mjs` as JavaScript and `.wasm` as `application/wasm`. Bundlers must preserve or resolve local worker/resource URLs. Local decoders may use WebAssembly.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix minimal scene",
        "ask": "Astrix minimal scene"
      }
    ]
  },
  {
    "id": "astrix-demos",
    "title": "included demos",
    "keys": [
      "demos",
      "demo pages",
      "examples",
      "included demos",
      "simulation",
      "helmet",
      "uniform viewer"
    ],
    "answer": "**Included engine demos:**\n- racetrack.html: start on foot beside both parked cars; riding, shallow water, skid marks, audio, headlights, tire dust and YouTube billboards.\n- drive.html: vehicle handling and automatically fitted riders.\n- flight.html: automatically aligned aircraft, complete fitted flap meshes, terrain collisions and YouTube billboards over the racetrack.\n- lifeforms.html: automatic humanoid fitting, procedural locomotion, posture, waving and mesh switching.\n- simulation.html: independent vehicles, lifeforms, moving objects, aircraft and streamed terrain.\n- dunes.html: birds, wind-driven sand/dust, sky, fog, shared-world day/night and YouTube billboards.\n- youtube.html: standalone three-model YouTube billboard demo.\n- Examples/uniform/, Examples/helmet/ and Examples/viewer/: baked-lighting, materials and model viewers.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix racetrack demo",
        "ask": "Astrix racetrack demo"
      },
      {
        "label": "Astrix lifeforms",
        "ask": "Astrix lifeforms"
      }
    ]
  },
  {
    "id": "astrix-racetrack",
    "title": "racetrack workflow",
    "keys": [
      "racetrack",
      "race track",
      "endurance run track",
      "avatar here",
      "both cars"
    ],
    "answer": "**racetrack.html** starts on foot beside **Furnariscafatigt and Normadic**. Walk within **1.5 metres along the ground** of a door, then press **Enter** or tap mobile Enter. Entry is rejected above **2 m/s**. Driver-side entry gives driving controls; passenger-side entry only seats you. Both supplied cars have left-side steering wheels.\n\nPress **Esc** or mobile Exit to leave. Ground support and standing clearance are checked; blocked exits keep you seated. Moving exits inherit vehicle momentum. Above **3 m/s**, the lifeform releases balance/pose assistance and tumbles before recovery.\n\nThe visible track renders once; physics uses its dedicated collider mesh and avatar-here sets the starting transform. Water, skid marks, audio, headlights, tire dust and YouTube billboards are included.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix vehicle riding",
        "ask": "Astrix vehicle riding"
      },
      {
        "label": "Astrix controls",
        "ask": "Astrix controls"
      }
    ]
  },
  {
    "id": "astrix-riding",
    "title": "vehicle seats and control transfer",
    "keys": [
      "vehicle riding",
      "enter",
      "exit",
      "enter vehicle",
      "exit vehicle",
      "enter car",
      "enter a car",
      "exit car",
      "exit a car",
      "ride vehicles",
      "driver side",
      "passenger side",
      "driver seat",
      "passenger seat",
      "seat fitting",
      "seated",
      "driving pose",
      "1 5 metres",
      "1 5m"
    ],
    "answer": "**Vehicle riding:** approach a door within **1.5 m**, then press **Enter** or mobile Enter. Entry requires a sufficiently slow vehicle (the demo rejects entry above **2 m/s**). Driver-side entry transfers driving controls; passenger-side entry only seats the rider.\n\nPress **Esc** or mobile Exit to leave. Exiting restores character physics and walking controls. Ground support and standing clearance are required; blocked exits keep the rider seated. Moving exits inherit momentum; above **3 m/s**, balance/pose motors release and the body tumbles. Slow exits retain standing behavior. After grounded torso motion stays quiet for **0.6 seconds**, recovery blends into staged get-up over **1.2 seconds**. Movement commands and key releases are retained during the tumble.\n\nThe fitted seat bends legs and raises driving arms. Mounted limb collisions, joints and posture motors are suspended; the mesh follows the full vehicle transform. There is no finger-grip/steering-wheel contact solver. APIs include life.enterVehicle(car) and life.exitVehicle(). Seat markers/interior geometry or metadata are needed. Exit before replacing the rider mesh or deleting an occupied car.\n\n`Examples/VehicleRider.js` demonstrates proximity selection, driver/passenger restrictions and input/camera transfer.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix racetrack demo",
        "ask": "Astrix racetrack demo"
      },
      {
        "label": "Astrix vehicle rigging",
        "ask": "Astrix vehicle rigging"
      }
    ]
  },
  {
    "id": "astrix-controls",
    "title": "walking and driving controls",
    "keys": [
      "controls",
      "keyboard",
      "touch controls",
      "mobile controls",
      "wasd",
      "arrow keys",
      "joysticks",
      "how to move",
      "how to drive"
    ],
    "answer": "**Controls depend on demo and actor:**\n- WASD/arrows: walk or drive; floating joysticks on touch.\n- Shift: run/vehicle boost; full movement stick runs on foot.\n- Q/E: lifeform strafe; right stick left/right on touch.\n- Space: jump on foot; hold to brake in a vehicle.\n- Double tap: jump on foot; latch vehicle brake. Joystick movement or another double tap releases the brake.\n- **Enter / Esc:** enter / exit vehicle; mobile Enter/Exit buttons.\n- **Z:** wave on foot / horn while driving.\n- **X:** headlights while driving; mobile Headlamp button.\n- [ cycles stand → sit → lie; ] reverses it. Touch right stick down/up, recenter between changes.\n- R resets in driving/flight demos.\n\nFlight: W nose down, S nose up; A/D roll, Q/E yaw. [ / ] decrease/increase throttle; Ctrl / Shift remain aliases. Touch sticks handle pitch/roll with separate throttle/rudder controls. Desktop R resets flight; the mobile flight Reset button was removed.\n\nTouch buttons appear only for a coarse primary pointer. Enter is proximity-dependent. Wave is lower left on foot; Exit/Horn/Headlamp use a compact seated row. Mobile status/help/telemetry text is hidden and the lifeform menu starts closed. There are no extra audio or YouTube enable/mute buttons.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix camera controls",
        "ask": "Astrix camera controls"
      },
      {
        "label": "Astrix mobile brake",
        "ask": "Astrix mobile brake"
      }
    ]
  },
  {
    "id": "astrix-brake",
    "title": "mobile brake",
    "keys": [
      "mobile brake",
      "double tap",
      "brake button",
      "latch brake",
      "release brake",
      "space brake"
    ],
    "answer": "**Vehicle braking:** desktop brakes while Space is held. Touch double tap latches the brake; **joystick movement or another double tap releases it**. There is no mobile brake button. On foot, double tap jumps. Steering does not automatically apply brakes or reduce power. Coasting now includes quadratic aerodynamic drag, contact-dependent rolling resistance and throttle-dependent engine braking in forward and reverse; gravity still acts on slopes.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-camera",
    "title": "camera and orbit",
    "keys": [
      "camera",
      "orbit",
      "zoom",
      "pan",
      "20 metres",
      "20m",
      "third person",
      "follow height"
    ],
    "answer": "**Camera:** drag to orbit; right drag, middle drag or Shift drag to pan. Touch orbit viewers support two-finger pan and pinch where available. Zoom-out is capped at **20 metres**, independently of physics distance tiers.\n\nCars and flight start 8 m behind with .08 rad elevation and a .45 m follow-target offset. Lifeforms start 4 m behind at .06 rad elevation, targeting .25 m below the torso origin. Simulation changes its camera with the selected actor. Applications can set followHeight in nova.connect().\n\nDuring a moving-exit tumble, the fallen-body camera keeps a stable heading and stays above terrain while looking down toward the character. The collision-adjusted camera is also the positional-audio listener.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-vehicles",
    "title": "automatic vehicle rigging",
    "keys": [
      "vehicle rigging",
      "automatic vehicle",
      "auto rig",
      "autor ig",
      "addvehicle",
      "wheel fitting",
      "suspension",
      "drivetrain",
      "normadic",
      "furnariscafatigt",
      "chassis",
      "awd",
      "fwd",
      "rwd"
    ],
    "answer": "**Automatic vehicle setup:** load a GLB and call `await physics.addVehicle(model)`, then add the model to the Nova scene. Recognizable wheel meshes/names supply wheel positions and radii; chassis geometry, mass placement and suspension are fitted automatically. Authored phy-body-* collision meshes are preferred. Existing relative wheel alignment is preserved.\n\nVehicles use ray suspension, AWD/FWD/RWD options, throttle/steer or forward/back/left/right/brake controls, braking and boost. Suspension stiffness follows mass and wheel radius, with clearance limits and bump stops. Tires raycast static geometry; dynamic contacts use the chassis. Arbitrary meshes still need recognizable vehicle geometry.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix tire grip",
        "ask": "Astrix tire grip"
      },
      {
        "label": "Astrix vehicle riding",
        "ask": "Astrix vehicle riding"
      }
    ]
  },
  {
    "id": "astrix-grip",
    "title": "rubber tire grip",
    "keys": [
      "tire grip",
      "tyre grip",
      "traction",
      "rubber",
      "drifting",
      "sideways slip",
      "lateral friction",
      "steering",
      "rollover"
    ],
    "answer": "**Rubber tire grip:** tire traction is separate from chassis friction (documented default coefficient 1.15). The later handling update raises high-speed lateral friction to 3.2. An iterative tire solver uses contact mass and chassis inertia to reduce sideways slip; unsupported wheels receive no tire drag.\n\nProgressive high-speed keyboard steering and a low fitted mass origin improve control and rollover stability. Steering does not trigger braking, power reduction or an added corner-speed clamp. The model is simplified and does not guarantee zero slip. Use `npm run test:lap` for the scripted course checks.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-aircraft",
    "title": "aircraft physics and controls",
    "keys": [
      "aircraft",
      "flight",
      "airplane",
      "aeroplane",
      "plane",
      "drone",
      "addaircraft",
      "thrust",
      "propulsion",
      "aileron",
      "elevator",
      "rudder",
      "stall"
    ],
    "answer": "**Aircraft:** physics.addAircraft(model) derives forward/up alignment, collision geometry and lifting area, and binds recognizable ailerons, elevators and rudders. Models use the authored -X front convention.\n\nPropulsion comes from configurable thrust driven by throttle. Physics also models angle-of-attack lift, stall reduction, drag and local pitch/roll/yaw rate controls. Full rotations are allowed without an upright clamp. W pitches down; S pitches up. Touch sticks handle pitch/roll, with separate throttle and rudder controls.\n\nflight.html uses the Endurance Run Track collider and starts the aircraft 40 m above avatar-here. This is a simplified flight model.\n\nCurrent flight controls also use A/D for roll, Q/E for yaw and [ / ] to decrease/increase throttle (Ctrl / Shift are aliases). Desktop R resets; the mobile flight Reset button was removed. Flight explicitly installs Dunes collision geometry alongside the track. The drone can collide, slide and rest, but has no added landing gear, damage or automatic landing controller. Fitted flap meshes and YouTube billboards are included. Terrain queries reject separated regions before costly narrow-phase work while keeping the contact solver.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix controls",
        "ask": "Astrix controls"
      }
    ]
  },
  {
    "id": "astrix-lifeforms",
    "title": "procedural artificial life",
    "keys": [
      "lifeforms",
      "lifeform",
      "artificial life",
      "humanoid",
      "biped",
      "givelife",
      "walking",
      "running",
      "strafe",
      "procedural locomotion"
    ],
    "answer": "**Procedural lifeforms:** `nova.giveLife()` estimates an upright humanoid fit, builds a **12-part physical biped with 11 joints**, and binds the visible GLB using generated skinning.\n\nBehaviors include walking/running forward and backward, strafing, turning, jumping, stand/sit/lie transitions, waving, recovery breathing and varied idle gestures. Mesh switching retains identity and learned policy while refitting proportions.\n\nMotion uses procedural targets, terrain probes, joint motors and balance assistance; it is not torque-only learned balance. Unusual anatomy or poses can fit poorly. Supplied FBX files are motion references, not runtime animation imports.\n\nNormal idle, walk, jog and run retain assistance. Desktop movement accelerates from walk to jog; Shift accelerates jog to run, while touch speed follows stick level. Planted foot orientation is stable through ordinary gait, with fitted shoulder clearance and speed-based arm swing for supplied A-pose meshes. During fast moving-vehicle exits, balance/pose motors release until settling and recovery.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix posture and waving",
        "ask": "Astrix posture and waving"
      },
      {
        "label": "Astrix crowd performance",
        "ask": "Astrix crowd performance"
      }
    ]
  },
  {
    "id": "astrix-posture",
    "title": "posture, waving and idle",
    "keys": [
      "posture",
      "waving",
      "wave",
      "sit",
      "sitting",
      "lie",
      "lying",
      "idle",
      "breathing",
      "neck",
      "elbow",
      "natural motion"
    ],
    "answer": "**Lifeform actions:** press Z or the mobile wave button to wave. [ cycles standing → sitting → lying; ] reverses it. On touch, move the right stick down/up and recenter between changes. Idle gestures and recovery breathing are procedural.\n\nMotion tuning includes firmer planted feet, smoother walk/run transitions, stronger neck support, head looks, controlled elbow bending and a render-only waist transform. FBX references are not played as imported animations.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-crowds",
    "title": "lifeform distance budgets",
    "keys": [
      "crowd",
      "crowds",
      "crowd performance",
      "maxdetailedlifeforms",
      "detailed lifeforms",
      "48 lifeforms",
      "1000 ragdolls",
      "articulated physics"
    ],
    "answer": "**Crowd budget:** with distance LOD enabled, at most **four lifeforms** receive detailed articulated physics by default. The controlled actor takes priority, followed by requested jump/wave/posture actions and nearby actors. Set maxDetailedLifeforms at world creation to change the limit.\n\nOther actors use approximate logical movement and procedural poses at 15/5/1 Hz by distance, without limb collisions or joint solving. Settled sit/lie poses remain; special actions wait for a detailed slot. Disabling distance LOD enables full physics for all actors at higher cost.\n\nMeshes, weights and textures are shared, but each actor has its own palette. This is not 1,000 simultaneous full ragdolls or hardware-instanced drawing.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-physics",
    "title": "collision bodies and shapes",
    "keys": [
      "astrix physics",
      "physics bodies",
      "collider",
      "collision",
      "bodies",
      "capsule",
      "trimesh",
      "convex",
      "raycast",
      "sensors",
      "solid true",
      "sat",
      "bvh"
    ],
    "answer": "**Astrix physics** supports independent static, dynamic and kinematic bodies; box, sphere, capsule and mesh/trimesh shapes; triangle BVHs, convex SAT contacts, impulse/friction solving, sleeping, collision masks and sensors. APIs include addBody(), addMesh(), addCapsule(), addCharacter(), applyImpulse(), setTransform(), raycast() and remove().\n\nMesh bodies accept GLBs or vertices/indices. GLB node transforms are baked into collision coordinates; body transforms add position/quaternion rotation, not runtime scale. Capsule height is 2 × (halfHeight + radius). Open meshes are surfaces; solid:true containment needs watertight non-self-intersecting geometry. Prefer simple colliders.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix limitations",
        "ask": "Astrix limitations"
      }
    ]
  },
  {
    "id": "astrix-rendering",
    "title": "Nova WebGPU rendering",
    "keys": [
      "rendering",
      "renderer",
      "pbr",
      "materials",
      "lightmaps",
      "msaa",
      "webp",
      "draco",
      "meshopt",
      "ktx2",
      "skinning",
      "webgpu"
    ],
    "answer": "**Nova** renders native WebGPU in a dedicated worker with **4× MSAA**. It supports metallic/roughness PBR, normal/AO/emissive maps, vertex colors, alpha mask/blend, UV transforms, baked lightmaps and GPU deformation for generated lifeform skins. Local GLB decoders include Draco, Meshopt, WebP and supported LDR KTX2.\n\nAdaptive resolution, pixel-density limits and distance/frustum culling reduce work. Repeated models share geometry/textures with independent transforms; ordinary models are not automatically hardware-instanced. General imported animation, transmission/volume/clearcoat shading and cast shadows are outside this release.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix environment lighting",
        "ask": "Astrix environment lighting"
      },
      {
        "label": "Astrix performance budgets",
        "ask": "Astrix performance budgets"
      }
    ]
  },
  {
    "id": "astrix-environment",
    "title": "Dunes, sky and lighting",
    "keys": [
      "environment",
      "dunes",
      "sky",
      "hdr",
      "lighting",
      "background",
      "birds",
      "wind",
      "sand",
      "dust",
      "fog",
      "day night",
      "daynight"
    ],
    "answer": "**Current environment:** driving, flight, lifeform, racetrack and simulation use Dunes sky, birds, atmospheric lighting and fog. The default shared-world day lasts **1,200 real seconds**: about ten minutes of day and ten of night, including twilight, anchored to the Unix UTC timestamp. Reloading, late joining, timezone changes and hidden-tab resume preserve phase when device clocks agree. No internet-time lookup is made. nova.setWorldTimeOffset(milliseconds) supports a future server clock offset. Explicit dunes: {clock:'local'} retains optional 24-hour local-clock mode.\n\nWind-driven ground sand and ambient dust belong to dedicated Dunes terrain; supported driving scenes also have tire dust. The earlier six-image sky/HDR files were removed. Nova retains an HDR loader for supplied environments; the uniform viewer keeps baked lighting. Optional visual Dunes terrain has no automatic collider, but flight explicitly installs Dunes collision geometry alongside the track.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-skids",
    "title": "slip-based skid marks",
    "keys": [
      "skid marks",
      "skids",
      "skidding",
      "tire marks",
      "tyre marks",
      "512 segments"
    ],
    "answer": "**Skid marks** reuse focused-car wheel contacts. Stronger slip makes marks darker and slightly wider. Normal rolling, airborne wheels and water produce no marks. A bounded **512-segment buffer** reuses resources and fades old marks. This cosmetic effect does not change vehicle forces.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-water",
    "title": "shallow racetrack water",
    "keys": [
      "water",
      "ripples",
      "shallow water",
      "wet grip"
    ],
    "answer": "**Racetrack water** is cosmetic shallow water with bounded tire ripples. It does not change tire grip or suspension. Wheels in water do not emit skid marks.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-performance",
    "title": "performance budgets",
    "keys": [
      "performance",
      "budgets",
      "fps",
      "30 fps",
      "60 hz",
      "distance lod",
      "distance tiers",
      "freeze",
      "sleeping",
      "hidden tabs",
      "pixel ratio"
    ],
    "answer": "**Performance-first defaults:**\n- Nova targets **30 FPS**, with adaptive resolution and a 1.25 max pixel ratio.\n- Near/medium/far physics: **60/15/5 Hz**.\n- Distance thresholds: near **20**, far **60**, freeze **140** world units; hysteresis **2**.\n- Up to **four** detailed lifeforms with distance LOD enabled.\n- Hidden tabs pause rendering/automatic physics, suspend local audio and release YouTube players.\n- Per-asset defaults: **128 MiB** download, **256 MiB** decoded geometry, **1024 px** texture dimension.\n\nFar simulation skips expensive collision/suspension/aerodynamics; frozen bodies stop moving. Camera/selected-actor focus keeps nearby interactions active. The 20 m orbit limit is separate. These are budgets, not guaranteed device frame rates.\n\nAdditional bounded work: tire dust uses 32 pooled puffs and one active draw with no new physics queries. YouTube retains at most three players and updates gain at most 10 Hz. Local audio uses three continuous car sources or at most four aircraft sources, six simultaneous short effects, source updates at most 20 Hz and listener updates at 10 Hz.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ],
    "actions": [
      {
        "label": "Astrix crowd performance",
        "ask": "Astrix crowd performance"
      },
      {
        "label": "Astrix terrain streaming",
        "ask": "Astrix terrain streaming"
      }
    ]
  },
  {
    "id": "astrix-streaming",
    "title": "GLB loading and terrain streaming",
    "keys": [
      "streaming",
      "terrain streaming",
      "heavy glb",
      "large glb",
      "loading progress",
      "cancelasset",
      "createstreamer",
      "byteshint",
      "residency",
      "cells"
    ],
    "answer": "**Heavy GLBs** download and decode in an asset worker, with progress/cancellation and chunked buffer uploads. A single file is not progressively rendered during download or automatically divided into cells; compressed and decoded data must fit memory. nova.loadGLB() creates a descriptor; worker progress starts when it is added. Subscribe via nova.on(\"progress\", callback); cancel with nova.cancelAsset(asset).\n\nLarge worlds use separately authored GLB cells with nova.createStreamer(). Cells must already be in world positions; center/radius are residency bounds, not transforms. Unloading releases render resources and static physics. Hysteresis, maxConcurrent, maxResident, maxResidentBytes and bytesHint control residency; memory-blocked cells require streamer.retry(id). Limits do not cap every browser/driver allocation.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-minimal",
    "title": "minimal scene API",
    "keys": [
      "minimal scene",
      "code example",
      "scene api",
      "givelife example",
      "connect physics",
      "sample code"
    ],
    "answer": "**Minimal scene using the generated minified engines:**\n```js\nimport Physics from './build/Physics/physics.min.js';\nimport Nova from './build/Nova/nova.min.js';\n\nconst physics = await Physics.create({autoStart: false});\nconst nova = await Nova.create({\n  canvas: document.querySelector('canvas'),\n  performance: {targetFPS: 30, maxPixelRatio: 1.25}\n});\nconst ground = await nova.loadGLB('/assets/ground.glb');\nnova.scene.add(ground);\nawait physics.addMesh(ground, {type: 'static'});\nconst life = await nova.giveLife('/assets/avatar.glb', physics, {\n  position: [0, 2, 0]\n});\nnova.connect(physics, {followBody: life.rootId});\nnova.controls.enableOrbit({distance: 4, maxDistance: 20});\nnova.start();\nawait nova.whenReady;\nawait physics.resume();\nawait life.setControls({mode: 'walk', forward: 1});\n```\nSupply your own ground/avatar GLBs at the shown paths and preserve the relative `build/` layout. Spawn above actual collision ground. Bind your own keyboard/touch input to returned handles; the library does not install demo controls automatically.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-limits",
    "title": "current release limitations",
    "keys": [
      "limitations",
      "boundaries",
      "unsupported",
      "continuous collision",
      "ccd",
      "tunneling",
      "blender",
      "cast shadows",
      "video textures",
      "youtube",
      "device loss",
      "animation import",
      "fbx",
      "license"
    ],
    "answer": "**0.4.0 boundaries:** experimental custom physics with bounded-cost contacts and simplified vehicle/flight models. There is no complete continuous collision detection for every shape; fast/small objects may tunnel. Dense piles and large moving concave meshes can be expensive or unstable.\n\nAutomatic fitting assumes upright humanoids. Generated lifeform skinning is supported, but general imported animation/FBX playback, transmission/volume/clearcoat shading, cast shadows and exact Blender reproduction are outside this release. General video-texture playback is not implemented by the YouTube integration. Current billboards use official cross-origin YouTube embeds, requiring internet access, embedding permission and normal user input if autoplay rules block sound. This is not video extraction or video-to-texture copying. Recreate Nova after WebGPU device loss; recovery is not automatic.\n\nRetain decoder and asset notices when redistributing. The READMEs do not assign a new engine/asset license; Dunes credits/MIT notice are in Nova/src/dunes/LICENSE.txt and its built resource copy; decoder notices are under Shared/vendor/ and its build/package copies.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-validation",
    "title": "tests and validation",
    "keys": [
      "validation",
      "tests",
      "testing",
      "benchmark",
      "npm test",
      "test lap",
      "pack offline",
      "qa reports",
      "phone fps"
    ],
    "answer": "**Validation commands for the organized release:**\n- `npm test`: pretest rebuilds, then regression/build/HTTP checks run.\n- `npm run test:build`: focused minified dependency/API/worker checks.\n- `npm run test:lap`: scripted racetrack laps for both cars.\n- `npm run pack:offline`: test, generate separate packages and verify offline installation.\n\n`docs/VALIDATION.md` records Node.js **24.19.0**, **76 existing regression commands**, **two added minified-build/HTTP checks**, separate and combined engine builds, and offline installation with an empty npm cache. HTTP checks cover **19 deliveries**. Recorded outputs include **48 minified JavaScript modules with embedded-source maps** and parity for **18 readable/commented HTML pages**.\n\nChecks cover a closed runtime dependency graph, API parity, deterministic simulation, an actual minified physics worker, source/build parity, installed worker motion, freeze/wake and compressed-fixture decoding. Reports: `qa/VALIDATION.log`, `qa/RESULTS.json`, `qa/BUILD.log`, `qa/OFFLINE.log`, `qa/HTML-VALIDATION.log`.\n\nThese are archive-recorded results. The full suite was not rerun while updating the README or VIA knowledge. No new device FPS, live WebGPU rendering, YouTube playback or listening verification is claimed.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-docs",
    "title": "engine documentation and layout",
    "keys": [
      "documentation",
      "readme",
      "project layout",
      "source folders",
      "vehicle riding md",
      "artificial life md",
      "which readme",
      "source layout",
      "source code",
      "source folders",
      "project layout",
      "organized source",
      "Nova/src/Nova.js",
      "Physics/src/Physics.js"
    ],
    "answer": "**Organized Astrix Nova + Physics source layout:**\n- `Nova/src/Nova.js`: Astrix Nova public API; `Nova/src/` contains rendering, workers, shaders, camera, skinning and effects.\n- `Physics/src/Physics.js`: Astrix Physics public API with compatible `Astrix` export; `Physics/src/` contains worlds, collisions, bodies, joints, vehicles, aircraft and lifeforms.\n- `Shared/`: loading, distance/clock policies, geometry helpers and local codecs.\n- `Examples/`: readable, commented HTML/JavaScript, controls, audio and integration helpers. Entry files include `Examples/racetrack/RacetrackExample.js` and `Examples/flight/FlightExample.js`.\n- `build/Nova/nova.min.js`, `build/Physics/physics.min.js`: generated minified API entries used by examples.\n- `build/Nova/`, `build/Physics/`, `build/Shared/`: minified modules/workers, source maps and required local resources; `build/manifest.json` maps runtime entries.\n- `assets/`, `docs/`, `docs/reference/`, `qa/`, `scripts/`, `tests/`, `npm/`, `server.js`: resources, guides, detailed notes, validation, JavaScript build/packaging tools, regression checks, generated package tarballs and local server.\n\n**Path case matters.** Former root `nova/`, `astrix/`, `core/`, `examples/` belong to the older archive layout.\n\nSee `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/SOURCE-MAP.md`, `docs/VALIDATION.md`, `build/README.md` and `Examples/README.md`. Detailed guides such as ARTIFICIAL-LIFE.md, VEHICLE-RIDING.md, PLAYER-AUDIO.md, TUMBLE-CAMERA.md and YOUTUBE-INTEGRATION.md are under `docs/reference/`.\n\nKnowledge follows the supplied README dated **16 October 2026** for `astrix-nova-physics-source-0.4.0.zip`. It supersedes older conflicting notes such as F entry, stopped-only exits, local-clock defaults and deferred YouTube. Retain bundled third-party decoder/asset notices; the README assigns no new engine or asset license.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-youtube",
    "title": "YouTube billboards",
    "keys": [
      "youtube",
      "billboards",
      "billboard",
      "boardscreen",
      "billboardtower",
      "double sided",
      "video playback",
      "6 dlxcf0bwq",
      "8nw04gav9lw",
      "nk03hu2bfy4"
    ],
    "answer": "**YouTube billboards:** racetrack.html, dunes.html and flight.html include all three authored models with **static collider meshes**. Racetrack/flight place a visible board in front of the starting camera. youtube.html is the standalone preview.\n- boardscreen: **6-dlxCF0bwQ**\n- billboardtower: **8nw04gAV9lw**\n- double-sided billboard: **Nk03Hu2BFy4**\n\nOfficial YouTube iframes fit the screen corners beneath the WebGPU canvas. Depth-tested transparent screen areas let closer geometry cover video. There is no extraction, video-to-texture copy, extra full-scene pass or per-frame terrain raycast. One player serves both faces of the double-sided board.\n\nSound is automatic with local distance attenuation: speakers are three metres above the base, volume fades from **35 m** and is silent by **55 m**, using full 3D listener distance. Looking away does not mute nearby boards. The iframe API supplies scalar volume, not directional stereo panning or terrain audio occlusion.\n\nAt most **three players** are retained. Out-of-budget players pause and are removed after **1.5 s**; hiding the tab releases them immediately. Volume commands run at most **10 Hz**, only on integer changes. Internet, embedding permission and possibly normal input for autoplay are required. No extra enable/mute buttons are shown.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-audio",
    "title": "positional engine and character sound",
    "keys": [
      "audio",
      "sound",
      "positional sound",
      "footsteps",
      "engine sound",
      "horn",
      "engine6",
      "listener",
      "panners"
    ],
    "answer": "**Positional audio** starts after ordinary keyboard/touch input. Engine/horn sources follow the car; footsteps use actual foot contacts, skids use slipping wheel contacts, and impacts play at the struck vehicle. The collision-adjusted camera is the listener. Recorded buffers cover walking/running, jump effort, landings, door entry/exit, engine shutdown, horn and impacts.\n\nThe current car mix uses one continuous engine6.ogg excerpt with smoothed speed/throttle pitch, separate speed-driven wind and road/loose-ground skid recordings. It does not blend competing car-engine recordings. Pitch approximates speed/throttle; there is no physical RPM telemetry. Footsteps are softened offline and tire slip lowers engine level for skid detail.\n\nBounds: three continuous car sources, at most four aircraft sources, six simultaneous short effects, source updates at most 20 Hz and listener updates at 10 Hz. The bank uses one fetch and under 2 MiB reused PCM with procedural fallback. Equal-power panners avoid HRTF; no audio raycasts or reverb passes. Hidden tabs suspend audio; teardown releases its graph. YouTube volume attenuation uses the iframe API separately.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-headlights",
    "title": "fitted vehicle headlights",
    "keys": [
      "headlights",
      "headlight",
      "headlamp",
      "lamp",
      "emitters"
    ],
    "answer": "**Headlights:** press **X** while driving or mobile Headlamp. Lights follow fitted lamp geometry in existing material shaders. One active vehicle supplies at most **eight emitters**, **24 m range** and **45 m camera cull**. There are no extra draw passes, shadow maps or physics queries, though fragment shading has a cost. Lights are unshadowed and can leak through occluders.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-dust",
    "title": "contact-based tire dust",
    "keys": [
      "tire dust",
      "tyre dust",
      "puffs",
      "loose terrain",
      "acceleration trail"
    ],
    "answer": "**Tire dust** reuses the followed vehicle's wheel contacts: at most **32 pooled puffs**, **one active draw**, and emission at most **20 Hz**. Loose terrain emits more strongly; pavement gives a lighter acceleration/slip trail. Puffs fade in **0.55–0.9 s**. Stopped, airborne, distant or water-covered wheels emit none. No extra physics queries are added. Ambient wind-driven sand/dust remains part of dedicated Dunes terrain.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-coasting",
    "title": "car coasting and drag",
    "keys": [
      "coasting",
      "coast",
      "engine braking",
      "rolling resistance",
      "aerodynamic drag",
      "release throttle"
    ],
    "answer": "**Vehicle coasting** uses quadratic aerodynamic drag, contact-dependent rolling resistance and throttle-dependent engine braking in forward and reverse. Releasing throttle gradually reduces speed while gravity still acts on slopes. These losses reuse existing wheel loads and add no raycasts.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-recovery",
    "title": "moving-exit tumble and recovery",
    "keys": [
      "tumble",
      "tumbling",
      "recovery",
      "get up",
      "moving exit",
      "fallen body",
      "standing controller",
      "balance assistance"
    ],
    "answer": "**Moving exits** inherit vehicle momentum. Above **3 m/s**, balance and pose motors release so the existing articulated body can tumble naturally. Slow exits retain standing behavior. Normal idle, walking, jogging and running continue to use assistance.\n\nAfter grounded torso motion stays quiet for **0.6 s**, recovery blends from the fallen pose into staged get-up over **1.2 s**. Movement commands and releases are retained during the tumble. The fallen-body camera keeps stable heading and stays above terrain, looking down at the character. Ground/standing clearance checks still block unsafe exits.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  },
  {
    "id": "astrix-virtual-experience-engine",
    "title": "Astrix as a virtual experience engine",
    "keys": [
      "virtual experience engine",
      "virtual experience",
      "virtual experiences",
      "virtual experience technology",
      "interactive experience engine",
      "virtual training engine",
      "simulation engine",
      "learning simulation"
    ],
    "requires": [
      "astrix",
      "nova",
      "physics",
      "virtual experience",
      "virtual experiences",
      "interactive experience engine",
      "virtual training engine",
      "simulation engine",
      "learning simulation"
    ],
    "engine": true,
    "answer": "**Astrix Nova + Physics can serve as a virtual experience engine:** software for building responsive digital environments in which users act, explore systems, practise tasks and observe results.\n\n**Nova** supplies native WebGPU rendering, models, materials, cameras and scene presentation. **Astrix physics** supplies collision bodies, movement, vehicle and aircraft behavior, and interaction with terrain. Procedural lifeforms and controls let participants walk through environments, enter vehicles and perform supported actions. Rendering, physics and heavy asset decoding use separate workers, with bounded workloads and distance budgets to prioritize responsive performance.\n\nIn a learning application, these capabilities could support virtual laboratories, equipment-operation exercises or guided simulations. The application would still need its own task objectives, instruction, task-specific behavior, feedback and assessment. An engine demo does not by itself establish training accuracy, learning outcomes or competence; subject specialists should validate those elements, with real-world practice where relevant.\n\n**VETA is the proposed learning organization; Astrix Nova + Physics is a technology engine that could support such experiences.** This describes a possible technical role, not a claim of an established VETA deployment, partnership, accreditation or government mandate."
  },
  {
    "id": "astrix-build",
    "title": "JavaScript sources and minified builds",
    "keys": [
      "build",
      "builds",
      "minify",
      "minified",
      "minification",
      "terser",
      "source maps",
      "npm run build",
      "build nova",
      "build physics",
      "build:nova",
      "build:physics",
      "javascript source",
      "typescript",
      "dist",
      "build folder",
      "rebuild"
    ],
    "answer": "**Astrix Nova + Physics sources and builds:** edit canonical readable JavaScript in `Nova/src/`, `Physics/src/`, `Shared/` and `Examples/`. There is no TypeScript compilation step. All **18 HTML pages** are expanded, formatted and commented, including layout, CSS and import maps.\n\nBuild commands:\n```sh\nnpm ci\nnpm run build\nnpm run build:nova\nnpm run build:physics\n```\n`npm ci` installs locked development dependencies once. `build` minifies both engines/shared code and assembles packages. `build:nova` builds Nova plus shared dependencies and its package; `build:physics` does the same for Physics.\n\nTerser performs development-time minification; Acorn supports development tooling. Neither adds an npm runtime dependency. Scripts preserve ES module exports, rewrite module/worker paths, copy runtime resources and emit source maps. Edit source and rebuild instead of separately maintaining generated files.\n\nExamples import engines/shared modules exclusively from `build/`, including direct helper imports. Example application JavaScript remains readable. Engines, workers and shared helpers are minified. Keep `build/Nova/`, `build/Physics/` and `build/Shared/` together. Source maps are not requested during ordinary play. Startup/play does not compile anything. Minification reduces delivery size; it does not by itself establish a device FPS improvement.",
    "engine": true,
    "requires": [
      "astrix",
      "nova",
      "physics",
      "3d engine",
      "webgpu",
      "lifeform",
      "lifeforms",
      "racetrack",
      "dunes",
      "skid marks",
      "vehicle rigging",
      "normadic",
      "furnariscafatigt",
      "giveLife",
      "addVehicle",
      "addAircraft",
      "terrain streaming",
      "vehicle",
      "vehicles",
      "car",
      "cars",
      "aircraft",
      "flight",
      "plane",
      "drone",
      "tire",
      "tyre"
    ]
  }
];

  // VETA founding proposal, discussion draft 16 October 2026: background knowledge only.
  var VETA_KNOWLEDGE = [
  {
    "id": "veta-overview",
    "title": "VETA — proposed initiative",
    "keys": [
      "veta",
      "virtual experience technology authority",
      "what is veta",
      "about veta"
    ],
    "answer": "**VETA — Virtual Experience Technology Authority** is a **proposed organization** for developing and applying virtual experience technology to education, practical skills training and simulation. Learners enter interactive environments to perform tasks, explore systems, practise decisions and learn from the results.\n\nThis is an organizational framework and founding proposal, a **discussion draft dated 16 October 2026**. It does not confer government status; organizational form, accreditation or a public mandate would be established separately.",
    "overview": true,
    "skipIf": [
      "veta-purpose",
      "veta-mission",
      "veta-vision",
      "veta-approach",
      "veta-programs",
      "veta-structure",
      "veta-delivery",
      "veta-principles",
      "veta-pilot",
      "veta-institutional",
      "veta-status"
    ]
  },
  {
    "id": "veta-purpose",
    "title": "VETA purpose",
    "keys": [
      "veta purpose",
      "purpose of veta",
      "why veta",
      "veta scope",
      "scope of veta"
    ],
    "answer": "**VETA's proposed purpose** is to make practical learning more accessible through virtual environments that connect instruction with experience. Its scope includes education, technical and vocational skills, engineering, industry, public safety and other fields where structured practice can improve understanding and readiness."
  },
  {
    "id": "veta-mission",
    "title": "VETA mission",
    "keys": [
      "veta mission",
      "mission of veta",
      "veta aim",
      "veta aims"
    ],
    "answer": "**VETA's mission:** create useful, affordable and reliable virtual learning experiences, and work with educators and subject specialists to connect those experiences to measurable learning outcomes."
  },
  {
    "id": "veta-vision",
    "title": "VETA vision",
    "keys": [
      "veta vision",
      "vision of veta"
    ],
    "answer": "**VETA's vision:** a society in which people can develop practical capability through accessible virtual experience, supported by instruction and real-world practice."
  },
  {
    "id": "veta-approach",
    "title": "VETA core approach",
    "keys": [
      "veta approach",
      "veta core approach",
      "approach of veta",
      "veta learning model",
      "how does veta teach"
    ],
    "answer": "**VETA's core approach:** the learner is an active participant. Each experience provides an objective, an environment to act within, consequences that respond to actions and feedback for improvement. Learners repeat tasks and progress from guided practice to independent performance.\n\n3D graphics, animation, physics and software interaction are tools for building these experiences. VETA's central product is the opportunity to practise and learn within a responsive environment."
  },
  {
    "id": "veta-programs",
    "title": "VETA program areas",
    "keys": [
      "veta programs",
      "veta program areas",
      "veta training areas",
      "veta fields",
      "veta technical education",
      "veta workforce training",
      "veta public safety",
      "veta education"
    ],
    "answer": "**Proposed VETA program areas:**\n- **Technical education:** interactive laboratories for electronics, microcontrollers, microprocessors, programming and engineering fundamentals.\n- **Workforce training:** simulated equipment operation, maintenance, troubleshooting and workplace procedures.\n- **Public safety:** guided scenarios for emergency preparedness, evacuation and response coordination.\n- **Education and exploration:** interactive environments for physical systems, scientific concepts and practical processes."
  },
  {
    "id": "veta-structure",
    "title": "VETA proposed structure",
    "keys": [
      "veta structure",
      "structure of veta",
      "veta organization",
      "veta organisation",
      "veta director",
      "veta leadership",
      "who leads veta",
      "who runs veta",
      "veta team"
    ],
    "answer": "**VETA's proposed structure:** a director would coordinate direction, program priorities, partnerships and resources. No individual is named in this framework.\n- **Learning and training:** defines objectives, prepares instruction and develops exercises with educators.\n- **Technology and simulation:** develops interactive environments, system behavior, controls and performance.\n- **Validation and assessment:** reviews technical accuracy, usability and evidence of learning.\n- **Partnerships and operations:** coordinates pilot delivery, budgets, documentation and institutional relationships.\n\nA small initial team may combine these functions. Subject specialists should review training content within their expertise."
  },
  {
    "id": "veta-delivery",
    "title": "VETA program delivery",
    "keys": [
      "how a veta program works",
      "how does veta work",
      "veta delivery",
      "veta program works",
      "veta process",
      "veta assessment",
      "veta evaluation"
    ],
    "answer": "**How a proposed VETA program works:** begin with a specific skill and intended learner group. Define the task, build a simulation, provide guided practice and evaluate performance through an independent exercise. Feedback explains what happened and supports another attempt.\n\nWhere relevant, supervised real-world practice checks whether learning transfers beyond the simulation."
  },
  {
    "id": "veta-principles",
    "title": "VETA development principles",
    "keys": [
      "veta principles",
      "veta development principles",
      "veta accessibility",
      "veta performance",
      "veta accuracy",
      "veta measurement",
      "veta learning value"
    ],
    "answer": "**VETA's development principles:**\n- **Learning value:** build interactions around clear tasks and useful feedback.\n- **Accessibility:** support affordable devices and understandable controls; require immersive hardware only when it benefits the task.\n- **Performance:** prioritize reliable behavior and responsive interaction before visual complexity.\n- **Accuracy:** review simulated behavior and instruction with qualified specialists.\n- **Measurement:** distinguish participation, task completion and demonstrated competence."
  },
  {
    "id": "veta-pilot",
    "title": "VETA initial demonstration",
    "keys": [
      "veta pilot",
      "veta demo",
      "veta demonstration",
      "veta initial demonstration",
      "veta first module",
      "veta microcontroller",
      "veta laboratory",
      "veta lab"
    ],
    "answer": "**VETA's proposed first module** is a virtual microcontroller laboratory. Learners would configure simple inputs/outputs, run a program, inspect behavior and troubleshoot a controlled fault.\n\nDeliverables would include a working exercise, instructor guidance and a performance report. The pilot would be reviewed for technical accuracy and tested with a small learning group before expansion. This is a proposal, not a claim that a pilot has already been delivered."
  },
  {
    "id": "veta-institutional",
    "title": "VETA partnerships and institutional development",
    "keys": [
      "veta partners",
      "veta partnerships",
      "veta funding",
      "veta support",
      "veta institutional development",
      "veta budget"
    ],
    "answer": "**VETA would seek educational and industry partners** for content review, pilot sites and development support. Funding proposals would specify deliverables, costs, responsibilities and evaluation criteria. The founding framework does not name confirmed partners, committed funding or a budget."
  },
  {
    "id": "veta-status",
    "title": "VETA proposal status",
    "keys": [
      "veta status",
      "veta government",
      "veta authority",
      "is veta official",
      "is veta a government agency",
      "veta accreditation",
      "veta mandate",
      "veta founding proposal",
      "veta proposal",
      "veta established"
    ],
    "answer": "**VETA is a proposed initiative**, described in a founding-proposal discussion draft dated **16 October 2026**. Its organizational form, any accreditation and any public mandate would be established separately. The framework **does not confer government status** or establish an existing government authority."
  }
];

  function createVia(overrides = {}) {
    return createBot({
      name: "Via",
      // Beyond AI first, then the rest of the original queries.js knowledge (Q-Pod / e-cash, slots), then everyday chat.
      knowledge: [...BEYOND_AI_KNOWLEDGE, ...ASTRIX_NOVA_KNOWLEDGE, ...VETA_KNOWLEDGE, ...QPOD_KNOWLEDGE, ...SLOTS_KNOWLEDGE, ...EVERYDAY],
      responses: VIA_SMALL_TALK,
      smallTalkWithKnowledge: true,
      reflections: REFLECTIONS,
      synonyms: [...QPOD_SYNONYMS, ...SYNONYMS],
      greetings: VIA_GREETINGS,
      fallbacks: VIA_FALLBACKS,
      gentle: true,
      // Liza's own conversation topics (dreams, family, religion, curiosity…), gently. Her grammar-pattern
      // templates ("i am…", "you are…") stay off because they tend to sound blunt; empathy.js covers those.
      lizaTemplates: true,
      lizaTopics: LIZA_TOPIC_IDS,
      bridge: viaBridge,
      fallbackActions: [{ label: "Talk to the team", ask: "How can I contact you?" }, CONTACT_US],
      defaultActions: MAIN_ACTIONS,
      moodLines: VIA_MOOD_LINES,
      moodPrompts: VIA_MOOD_PROMPTS,
      hub: { name: "Clark, Philippines", timeZone: "Asia/Manila" },
      business: {
        serviceIds: Object.keys(NEED_LABELS),
        needLabels: NEED_LABELS,
        advise: viaAdvice,
        summaryActions: (facts) => [{ label: "Email this summary", href: emailWithSummary(facts) }, CONTACT_US]
      },
      crisis: {
        message: "I'm really sorry you're feeling this way. You deserve support right now.\nIf you are in danger, please call your local emergency number.\nIn the Philippines you can call the NCMH Crisis Hotline at **1553** (free, 24/7). Elsewhere, please contact your local crisis line.\nIf you can, reach out to someone you trust and let them know how you're feeling."
      },
      ...overrides
    });
  }

  // src/widget.js
  function mountWidget(options) {
    const opts = {
      title: options.bot.name,
      subtitle: "Online",
      welcomeTitle: `Hi, I'm ${options.bot.name}.`,
      welcomeText: "Ask me anything.",
      suggestions: [],
      showMood: true,
      siteUrl: "",
      reviveAfterMs: 0,
      container: document.body,
      startOpen: false,
      launcherLabel: "Open chat",
      colorScheme: "auto",
      ...options
    };
    const bot = opts.bot;
    injectStyles();
    const root = document.createElement("div");
    root.className = opts.colorScheme === "light" ? "lz-root lz-light" : "lz-root";
    root.innerHTML = TEMPLATE;
    opts.container.appendChild(root);
    const $ = (sel) => (
      /** @type {HTMLElement} */
      root.querySelector(sel)
    );
    const launcher = $(".lz-launcher");
    const panel = $(".lz-panel");
    const messages = $(".lz-messages");
    const form = (
      /** @type {HTMLFormElement} */
      $(".lz-composer")
    );
    const input = (
      /** @type {HTMLTextAreaElement} */
      $(".lz-composer textarea")
    );
    const sendBtn = (
      /** @type {HTMLButtonElement} */
      $(".lz-send")
    );
    $(".lz-title strong").textContent = opts.title;
    $(".lz-title span").textContent = opts.subtitle;
    launcher.setAttribute("aria-label", opts.launcherLabel);
    let busy = false;
    let started = false;
    let reviveTimer = 0;
    function setOpen(open) {
      panel.classList.toggle("lz-open", open);
      launcher.setAttribute("aria-expanded", String(open));
      launcher.setAttribute("aria-label", open ? "Close chat" : opts.launcherLabel);
      if (open) setTimeout(() => input.focus(), 150);
    }
    launcher.addEventListener("click", () => setOpen(!panel.classList.contains("lz-open")));
    $(".lz-close").addEventListener("click", () => setOpen(false));
    const onKey = (e) => {
      if (e.key === "Escape" && panel.classList.contains("lz-open")) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    function scrollDown() {
      messages.scrollTop = messages.scrollHeight;
    }
    function addUser(text, mood) {
      const el = document.createElement("div");
      el.className = "lz-msg lz-user";
      el.textContent = text;
      messages.appendChild(el);
      if (opts.showMood && mood && mood.mood !== "neutral") {
        const tag = document.createElement("div");
        const label = MOOD_LABELS[mood.mood];
        tag.className = `lz-mood lz-mood-${mood.mood}`;
        tag.textContent = `${label.emoji} ${label.label}${mood.intensity === "strong" ? " (strong)" : ""}`;
        tag.title = mood.cues.length ? `Detected from: ${mood.cues.join(", ")}` : "";
        messages.appendChild(tag);
      }
      scrollDown();
    }
    function addBot(text, actions) {
      const el = document.createElement("div");
      el.className = "lz-msg lz-bot";
      el.innerHTML = renderText(text);
      el.querySelectorAll("a").forEach((a) => a.addEventListener("click", (e) => onLink(e, a.getAttribute("href") || "")));
      messages.appendChild(el);
      addActions(actions);
      const top = el.offsetTop - messages.offsetTop - 8;
      if (el.offsetHeight > messages.clientHeight * 0.7) messages.scrollTop = top;
      else scrollDown();
    }
    function addActions(actions) {
      if (!actions || !actions.length) return;
      const wrap = document.createElement("div");
      wrap.className = "lz-suggestions lz-inline";
      for (const action of actions) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = action.label;
        b.addEventListener("click", () => runAction(action));
        wrap.appendChild(b);
      }
      messages.appendChild(wrap);
    }
    function showTyping() {
      const el = document.createElement("div");
      el.className = "lz-msg lz-bot lz-typing";
      el.setAttribute("aria-label", `${bot.name} is typing`);
      el.innerHTML = "<i></i><i></i><i></i>";
      messages.appendChild(el);
      scrollDown();
      return el;
    }
    function runAction(action) {
      var _a;
      if (opts.onAction && opts.onAction(action) === true) return;
      if (action.href) return goTo(action.href);
      send((_a = action.ask) != null ? _a : action.label);
    }
    function onLink(event, href) {
      if (href.startsWith("#")) {
        event.preventDefault();
        goTo(href);
      }
    }
    function goTo(href) {
      if (href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          if (window.matchMedia("(max-width: 480px)").matches) setOpen(false);
          return;
        }
        if (opts.siteUrl) window.open(opts.siteUrl.replace(/\/$/, "") + "/" + href, "_blank", "noopener");
        return;
      }
      window.open(href, /^(tel|mailto):/.test(href) ? "_self" : "_blank", "noopener");
    }
    function welcome() {
      messages.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.className = "lz-welcome";
      const h = document.createElement("h2");
      h.textContent = opts.welcomeTitle;
      const p = document.createElement("p");
      p.textContent = opts.welcomeText;
      wrap.append(h, p);
      const sug = document.createElement("div");
      sug.className = "lz-suggestions";
      for (const s of opts.suggestions) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = s;
        b.addEventListener("click", () => send(s));
        sug.appendChild(b);
      }
      wrap.appendChild(sug);
      messages.appendChild(wrap);
      started = false;
    }
    function send(textArg) {
      const text = (textArg === void 0 ? input.value : textArg).trim();
      if (!text || busy) return;
      if (!started) {
        messages.innerHTML = "";
        started = true;
      }
      busy = true;
      input.value = "";
      autosize();
      updateSendState();
      const reply = bot.reply(text);
      addUser(text, reply.mood);
      const typing = showTyping();
      setTimeout(() => {
        typing.remove();
        addBot(reply.text, reply.actions);
        busy = false;
        updateSendState();
        armRevive();
      }, typingDelay(reply.text));
    }
    function armRevive() {
      clearTimeout(reviveTimer);
      if (!opts.reviveAfterMs) return;
      reviveTimer = window.setTimeout(() => {
        const line = bot.revive();
        if (line && panel.classList.contains("lz-open") && !busy) addBot(line.text);
      }, opts.reviveAfterMs);
    }
    function autosize() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 120) + "px";
      input.style.overflowY = input.scrollHeight > 120 ? "auto" : "hidden";
    }
    function updateSendState() {
      sendBtn.disabled = busy || !input.value.trim();
    }
    // Send directly on click/tap: embedded hosts may block native form submission.
    sendBtn.addEventListener("click", (e) => {
      e.preventDefault();
      send();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    input.addEventListener("input", () => {
      autosize();
      updateSendState();
    });
    $(".lz-clear").addEventListener("click", () => {
      if (busy) return;
      bot.reset();
      clearTimeout(reviveTimer);
      welcome();
      input.focus();
    });
    welcome();
    if (opts.startOpen) setOpen(true);
    return {
      open: () => setOpen(true),
      close: () => setOpen(false),
      send,
      destroy() {
        clearTimeout(reviveTimer);
        document.removeEventListener("keydown", onKey);
        root.remove();
      }
    };
  }
  function typingDelay(text) {
    return Math.min(500 + text.length * 6, 1600);
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var SAFE_HREF = /^(https?:\/\/|mailto:|tel:|#)/i;
  function inline(text) {
    return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>").replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
      const url = href.replace(/&amp;/g, "&");
      if (!SAFE_HREF.test(url)) return label;
      const external = /^https?:/i.test(url);
      return `<a href="${escapeHtml(url)}"${external ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    });
  }
  function renderText(text) {
    return String(text).split(/\n{2,}/).map((block) => {
      const lines = block.split("\n");
      const html = [];
      let list = [];
      const flushList = () => {
        if (list.length) html.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`);
        list = [];
      };
      for (const line of lines) {
        const bullet = line.match(/^\s*[-•]\s+(.*)$/);
        if (bullet) list.push(bullet[1]);
        else {
          flushList();
          if (line.trim()) html.push(inline(line));
        }
      }
      flushList();
      return `<p>${html.join("<br>").replace(/<br>(<ul>)/g, "$1").replace(/(<\/ul>)<br>/g, "$1")}</p>`;
    }).join("");
  }
  var ICON_CHAT = '<svg class="lz-icon-open" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M12 8.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z" fill="currentColor"/></svg>';
  var ICON_X = '<svg class="lz-icon-close" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var TEMPLATE = `
<button class="lz-launcher" type="button" aria-expanded="false" aria-haspopup="dialog">${ICON_CHAT}${ICON_X}</button>
<section class="lz-panel" role="dialog" aria-label="Chat assistant" aria-modal="false">
  <header class="lz-header">
    <div class="lz-avatar" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2z"/></svg></div>
    <div class="lz-title"><strong></strong><span></span></div>
    <button class="lz-icon-btn lz-clear" type="button" title="Start new chat" aria-label="Start new chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>
    <button class="lz-icon-btn lz-close" type="button" title="Close" aria-label="Close chat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>
  </header>
  <div class="lz-messages" aria-live="polite"></div>
  <form class="lz-composer">
    <textarea rows="1" placeholder="Type your message…" aria-label="Message"></textarea>
    <button class="lz-send" type="button" aria-label="Send message" disabled><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
  </form>
</section>`;
  // Styles ship in css/via.css; the site CSP (style-src 'self') blocks injected <style> tags.
  function injectStyles() {
  }

  // widget/via-entry.js
  function start() {
    var _a, _b, _c;
    const config = window.VIA_CONFIG || {};
    let instance = null;
    const getBot = () => instance || (instance = createVia({ memory: config.memory !== false, memoryKey: config.memoryKey }));
    const bot = { name: "Via", reply: (text) => getBot().reply(text), revive: () => getBot().revive(), reset: () => getBot().reset() };
    window.via = mountWidget({
      bot,
      title: "Via",
      subtitle: "Beyond AI assistant · Online",
      welcomeTitle: "Hi! I'm Via from Beyond AI.",
      welcomeText: "Ask me about our AI, cloud and cybersecurity services, our products, or the AI Education course. Or just chat. You can write a whole paragraph and I'll respond to every part.",
      suggestions: ["What services do you offer?", "Tell me about your products", "Do you have an AI course?", "How do I contact you?"],
      showMood: (_a = config.showMood) != null ? _a : false,
      startOpen: (_b = config.startOpen) != null ? _b : false,
      launcherLabel: "Chat with Via",
      colorScheme: (_c = config.colorScheme) != null ? _c : "auto"
    });
    const launcher = document.querySelector(".lz-root .lz-launcher");
    const warm = () => {
      if (!instance) (window.requestIdleCallback || setTimeout)(() => getBot());
    };
    if (launcher) for (const type of ["pointerenter", "focus", "click"]) launcher.addEventListener(type, warm, { once: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
