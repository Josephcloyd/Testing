const profile = {
  name: "Allison Rose Suarez",
  role: "tourism student",
  education:
    "Allison is studying Bachelor of Science in Tourism Management Entrepreneurship at Cebu Technological University, M.J. Cuenco Ave., Corner R. Palma St., Cebu City. Her academic year is 2024 to present.",
  experience:
    "Allison worked as a part-time McDonald's crew member from November 2024 to 2025 and completed an internship at Dessert Factory in April 2024. She gained customer service, food service, teamwork, workplace discipline, and fast-paced service experience.",
  skills:
    "Her key skills include Microsoft Word, PowerPoint presentations, Excel, Canva, CapCut, good communication, multitasking, customer service, lesson delivery, reporting, and presentation work.",
  strengths:
    "Allison's strongest qualities are confidence, passion, fast learning, adaptability, strong communication, multitasking, positive attitude, and commitment to excellent customer service.",
  tourism:
    "Allison is a strong fit for tourism and hospitality because she is studying tourism management, has customer-facing food service experience, communicates well, multitasks in busy environments, and is eager to contribute to a dynamic team.",
  hobbies:
    "Her hobbies include baking, cooking, hiking, camping, trekking, fishing, and reading. These interests show curiosity, creativity, resilience, patience, and a love for learning.",
  contact:
    "You can contact Allison at sonlirose2022@gmail.com or 0960 819 6417.",
  summary:
    "Allison Rose Suarez is a confident, passionate, and fast-learning tourism student dedicated to excellent customer service. She has McDonald's crew experience, Dessert Factory internship exposure, strong communication skills, and practical digital skills.",
};

const chatState = {
  apiAvailable: null,
  history: [],
};

const knowledge = [
  {
    intent: "experience",
    label: "Experience",
    keys: ["experience", "work", "mcdonald", "crew", "job", "employment", "background"],
    answer: profile.experience,
  },
  {
    intent: "education",
    label: "Education",
    keys: ["education", "school", "university", "college", "ctu", "course", "degree", "study"],
    answer: profile.education,
  },
  {
    intent: "skills",
    label: "Skills",
    keys: ["skill", "skills", "can do", "ability", "baking", "cooking", "food", "service"],
    answer: profile.skills,
  },
  {
    intent: "strengths",
    label: "Strengths",
    keys: ["strength", "strengths", "quality", "qualities", "good", "why hire", "hire", "best"],
    answer: profile.strengths,
  },
  {
    intent: "tourism",
    label: "Tourism fit",
    keys: ["tourism", "fit", "career", "student", "industry", "hospitality", "guest"],
    answer: profile.tourism,
  },
  {
    intent: "hobbies",
    label: "Hobbies",
    keys: ["hobby", "hobbies", "hiking", "camping", "trekking", "fishing", "reading", "read"],
    answer: profile.hobbies,
  },
  {
    intent: "contact",
    label: "Contact",
    keys: ["contact", "email", "phone", "number", "reach"],
    answer: profile.contact,
  },
  {
    intent: "summary",
    label: "Summary",
    keys: ["summary", "profile", "introduce", "tell me about", "who is"],
    answer: profile.summary,
  },
];

const chatPanel = document.querySelector("#chatPanel");
const chatToggle = document.querySelector(".chat-toggle");
const chatClose = document.querySelector(".chat-close");
const chatMessages = document.querySelector("#chatMessages");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const questionButtons = document.querySelectorAll("[data-chat-question]");
const apiBadge = document.querySelector("#apiBadge");

function addMessage(text, type = "bot") {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setThinking(isThinking) {
  chatForm.classList.toggle("is-thinking", isThinking);
  chatInput.disabled = isThinking;
}

function updateApiBadge(status) {
  if (status === "live") {
    apiBadge.textContent = "AI API ready";
    apiBadge.classList.add("live");
    return;
  }

  apiBadge.textContent = "Local mode";
  apiBadge.classList.remove("live");
}

function openChat() {
  chatPanel.hidden = false;
  chatToggle.setAttribute("aria-expanded", "true");

  if (!chatMessages.children.length) {
    addMessage(
      "Hi, I am Allison's portfolio guide. You can ask normally, like: Why should HR consider Allison? What experience does she have? What are her strengths?"
    );
  }

  chatInput.focus();
}

function closeChat() {
  chatPanel.hidden = true;
  chatToggle.setAttribute("aria-expanded", "false");
}

function scoreIntent(question, item) {
  const normalized = question.toLowerCase();
  return item.keys.reduce((score, key) => score + (normalized.includes(key) ? 1 : 0), 0);
}

function getLocalAnswer(question) {
  const normalized = question.toLowerCase();
  const ranked = knowledge
    .map((item) => ({ ...item, score: scoreIntent(normalized, item) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  if (normalized.includes("weakness") || normalized.includes("improve")) {
    return "A fair growth area to mention is that Allison is still building broader tourism-industry experience while studying. That said, her McDonald's crew experience and Dessert Factory internship give her a solid base in service, communication, teamwork, and workplace discipline.";
  }

  if (normalized.includes("interview") || normalized.includes("question")) {
    return "Good interview questions for Allison: Can you describe a busy shift you handled? How do you deal with difficult customers? What tourism role interests you most? How do your outdoor hobbies help your confidence and adaptability?";
  }

  if (normalized.includes("recommend") || normalized.includes("suggest")) {
    return "I would suggest presenting Allison as a confident and fast-learning tourism student with real customer-facing experience, digital presentation skills, and a positive attitude that fits hospitality and travel-related roles.";
  }

  if (best && best.score > 0) {
    return `${best.answer} HR note: this connects well to roles that need patience, clear communication, teamwork, and guest care.`;
  }

  return "I can answer HR-style questions about Allison's experience, skills, strengths, tourism fit, hobbies, contact details, or suggested interview questions. Try asking in a natural way, for example: Why is Allison a good fit for hospitality?";
}

async function getApiAnswer(question) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      profile,
      history: chatState.history.slice(-6),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API endpoint unavailable");
  }

  const data = await response.json();

  if (!data || typeof data.answer !== "string") {
    throw new Error("Invalid API response");
  }

  return data.answer;
}

async function getAnswer(question) {
  if (window.location.protocol === "file:") {
    chatState.apiAvailable = false;
    updateApiBadge("local");
    return getLocalAnswer(question);
  }

  if (chatState.apiAvailable !== false) {
    try {
      const answer = await getApiAnswer(question);
      chatState.apiAvailable = true;
      updateApiBadge("live");
      return answer;
    } catch (error) {
      chatState.apiAvailable = false;
      updateApiBadge("local");
    }
  }

  return getLocalAnswer(question);
}

async function askQuestion(question) {
  const cleanQuestion = question.trim();

  if (!cleanQuestion) {
    return;
  }

  openChat();
  addMessage(cleanQuestion, "user");
  chatState.history.push({ role: "user", content: cleanQuestion });
  setThinking(true);

  try {
    const answer = await getAnswer(cleanQuestion);

    window.setTimeout(() => {
      addMessage(answer);
      chatState.history.push({ role: "assistant", content: answer });
      setThinking(false);
    }, 220);
  } catch (error) {
    const fallbackAnswer = getLocalAnswer(cleanQuestion);
    chatState.apiAvailable = false;
    updateApiBadge("local");
    addMessage(fallbackAnswer);
    chatState.history.push({ role: "assistant", content: fallbackAnswer });
    setThinking(false);
  }
}

chatToggle.addEventListener("click", () => {
  if (chatPanel.hidden) {
    openChat();
  } else {
    closeChat();
  }
});

chatClose.addEventListener("click", closeChat);

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askQuestion(chatInput.value);
  chatInput.value = "";
});

questionButtons.forEach((button) => {
  button.addEventListener("click", () => askQuestion(button.dataset.chatQuestion));
});

updateApiBadge("local");
