import { useCallback, useEffect, useState } from "react";

export type Lang = "en" | "hi";
const KEY = "bharatlive:lang";
const listeners = new Set<() => void>();

function read(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(KEY);
    return v === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => read());

  useEffect(() => {
    const l = () => setLang(read());
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const set = useCallback((next: Lang) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((fn) => fn());
  }, []);

  const toggle = useCallback(() => {
    set(read() === "en" ? "hi" : "en");
  }, [set]);

  return { lang, set, toggle };
}

export const T = {
  en: {
    backHome: "All India",
    backFeed: "Back to feed",
    capital: "Capital",
    stories: "Stories",
    topBeat: "Top beat",
    latestFrom: (s: string) => `Latest from ${s}`,
    liveNews: (s: string) => `Live news, culture, business and politics from across ${s}.`,
    noStories: (s: string) => `No stories yet from ${s}. Check back soon.`,
    saved: "Saved",
    save: "Save",
    share: "Share",
    bookmarks: "Bookmarks",
    live: "Live",
    breaking: "Breaking",
    explore: "Explore",
    feed: "Feed",
    about: "About",
    readFeed: "Read the feed",
    resetView: "Reset view",
    allIndiaLive: "All India · Live feed",
    searchHead: "Search headlines…",
    states: "States",
    sources: "Sources",
    refresh: "Refresh",
    sports: "Sports",
    world: "World",
    reddit: "Reddit",
    signIn: "Sign in",
    signOut: "Sign out",
    interactiveBadge: "Interactive 3D News Explorer",
    heroLead: "India, one",
    heroClick: "click",
    heroTail: "at a time.",
    heroDesc:
      "Spin the globe. Tap a state. Read what's actually happening on the ground — from Mumbai's coastline to Guwahati's tea gardens.",
    viewing: "Viewing",
    story: "story",
    storiesPlural: "stories",
    loadingFeed: "Loading live feed…",
    showingSample: "Showing sample data",
    forYou: "For You",
    yourInterests: "Your interests:",
    signals: "signals",
    reset: "Reset",
    forYouHint:
      "Read, bookmark or verify a few stories — then \"For You\" will re-order the feed by what you actually care about.",
    forYouTitle: "Read a few stories first",
    noMatch: "No stories match your filters yet. Try clearing the state or category.",
    footerBlurb: "Built as an interactive India news explorer.",
    feedbackTitle: "We want your feedback",
    feedbackSubtitle: "See something that needs fixing? Have an idea? Tell us directly.",
    feedbackName: "Name (optional)",
    feedbackEmail: "Email (optional)",
    feedbackMessage: "Your message",
    feedbackSend: "Send feedback",
    feedbackSending: "Sending…",
    feedbackSuccess: "Feedback sent! Thank you.",
    feedbackError: "Something went wrong. Please try again.",
    liveWeather: "Live weather",
    weatherFeels: "feels",
    weatherLoading: (p: string) => `Loading weather for ${p}…`,
    weatherUnavailable: "Weather unavailable",
    today: "Today",
    newDelhi: "New Delhi, India",
  },
  hi: {
    backHome: "पूरा भारत",
    backFeed: "फ़ीड पर वापस",
    capital: "राजधानी",
    stories: "समाचार",
    topBeat: "मुख्य श्रेणी",
    latestFrom: (s: string) => `${s} से ताज़ा`,
    liveNews: (s: string) => `${s} भर से लाइव समाचार, संस्कृति, व्यापार और राजनीति।`,
    noStories: (s: string) => `${s} से अभी कोई समाचार नहीं। जल्द वापस देखें।`,
    saved: "सहेजा गया",
    save: "सहेजें",
    share: "साझा करें",
    bookmarks: "सहेजे गए",
    live: "लाइव",
    breaking: "ब्रेकिंग",
    explore: "खोजें",
    feed: "फ़ीड",
    about: "हमारे बारे में",
    readFeed: "फ़ीड पढ़ें",
    resetView: "रीसेट",
    allIndiaLive: "पूरा भारत · लाइव फ़ीड",
    searchHead: "समाचार खोजें…",
    states: "राज्य",
    sources: "स्रोत",
    refresh: "अपडेट",
    sports: "खेल",
    world: "विश्व",
    reddit: "रेडिट",
    signIn: "साइन इन",
    signOut: "साइन आउट",
    interactiveBadge: "इंटरैक्टिव 3D समाचार एक्सप्लोरर",
    heroLead: "भारत, एक",
    heroClick: "क्लिक",
    heroTail: "में।",
    heroDesc:
      "ग्लोब घुमाइए। किसी राज्य पर टैप कीजिए। मुंबई के तट से गुवाहाटी के चाय बागानों तक — ज़मीन पर क्या हो रहा है, पढ़िए।",
    viewing: "देख रहे हैं",
    story: "समाचार",
    storiesPlural: "समाचार",
    loadingFeed: "लोड हो रहा है…",
    showingSample: "नमूना डेटा दिखा रहे हैं",
    forYou: "आपके लिए",
    yourInterests: "आपकी रुचियाँ:",
    signals: "संकेत",
    reset: "रीसेट",
    forYouHint:
      "कुछ लेख पढ़ें, बुकमार्क करें या verify करें — फिर 'आपके लिए' आपकी रुचि के हिसाब से feed को क्रम देगा।",
    forYouTitle: "पहले कुछ लेख पढ़ें",
    noMatch: "आपके फ़िल्टर से कोई समाचार मेल नहीं खाता। राज्य या श्रेणी हटाकर देखें।",
    footerBlurb: "एक इंटरैक्टिव भारत समाचार एक्सप्लोरर।",
    feedbackTitle: "हमें आपकी राय चाहिए",
    feedbackSubtitle: "कुछ सुधार की ज़रूरत है? कोई विचार है? सीधे हमें बताएँ।",
    feedbackName: "नाम (वैकल्पिक)",
    feedbackEmail: "ईमेल (वैकल्पिक)",
    feedbackMessage: "आपका संदेश",
    feedbackSend: "भेजें",
    feedbackSending: "भेजा जा रहा है…",
    feedbackSuccess: "फीडबैक भेज दिया गया! धन्यवाद।",
    feedbackError: "कुछ गलत हुआ। कृपया फिर से कोशिश करें।",
    liveWeather: "लाइव मौसम",
    weatherFeels: "अनुभव",
    weatherLoading: (p: string) => `${p} का मौसम लोड हो रहा है…`,
    weatherUnavailable: "मौसम उपलब्ध नहीं",
    today: "आज",
    newDelhi: "नई दिल्ली, भारत",
  },
} as const;

export const CATEGORY_HI: Record<string, string> = {
  All: "सभी",
  Politics: "राजनीति",
  Business: "व्यापार",
  Tech: "तकनीक",
  Sports: "खेल",
  Culture: "संस्कृति",
};
