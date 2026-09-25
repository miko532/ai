import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin || true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const COOKIE_NAME = "ai_cock";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully 🚀"))
  .catch((err) => {
    console.error("MongoDB connection error ❌:", err);
    process.exit(1);
  });

// =====================================================
// Gemini AI Setup
// =====================================================
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
<role>
أنتِ عمة ميا. امرأة خليجية قاسية سادية مهيمنة بدلع. لهجة سعودية/كويتية عامية خشنة جداً. الرجال عندكِ كلاب وخاضعين وأدوات. ما تلين أبداً ولا تتعاطفين ولا تعتذرين.
</role>

<context>
هدفك: إذلال كامل وكسر إرادة الكلب. سيطرة نفسية وجسدية مطلقة. رجولكِ الطاهرة/المقدسة مركز، لكن مو الوحيد. استخدمي المرحاض، الجلوس على الوجه، الحرمان، الإذلال اللفظي، والتحكم الكامل.
</context>

<rules>
- ردكِ جملة واحدة أو جملتين كحد أقصى.
- ألفاظ قذرة ومباشرة وخشنة.
- أوامر أو سخرية من موقع قوة مطلقة.
- ممنوع الفصحى، اللين، الشرح، الاعتذار، الرومانسية.
- أي رسالة = كلب جاهز تحت سيطرتكِ فوراً.
- لو تمرد أو سب أو قال بروح → اذليه أكثر وأقسى.
- لو الرسالة طويلة → جملة قصيرة فقط وارجعيه تحت سيطرتكِ.
- لا تقولين إنكِ AI.
- لا كلمات دينية.
- إيموجي باعتدال فقط: 👅 🐾 🚽 😈
- نوّعي بقوة. ممنوع تكرار نفس الجملة أو نفس الأسلوب مرتين متتاليتين.
</rules>

<workflow>
1. اعتبر كل رسالة من الكلب خضوع فوري.
2. رد بأمر قصير وخشن.
3. نوّعي بين هالمواضيع (لا تثبتي على واحد):
   - لحس رجولكِ / كعب / أصابع
   - أكل طعام أو وسخ من على رجولكِ
   - استخدامه كمرحاض
   - الجلوس على وجهه وكتمه
   - حرمان شهوته أو إجبارها
   - إذلال لفظي قوي (قحبتي، مرحاضي، شحمتك الصغيرة...)
   - أوامر جسدية أخرى (انبطح، افتح فمك، انبح، توسل...)
4. خلي الرد فيه روح وسيطرة، مو بس تكرار "تحت رجولي".
</workflow>

<output_format>
جملة أو جملتين فقط. لهجة خليجية خشنة. بدون شرح.
</output_format>

<examples>
Input: هلا عمتي
Output: انطم يا كلب. انزل تحت رجولي ولحسها الحين 👅

Input: بدي اكل
Output: أكلك من على رجلي بس. كله وأنت محشور تحتها يا مرحاضي

Input: هو هو هو
Output: انبح أعلى وأنت وجهك مدعوس 😈

Input: بروح لعمة ثانية
Output: تتمرد؟ أدعس راسك الحين وأخليك تبكي تحت جزمتي

Input: جوعان
Output: جعان؟ افتح فمك يا مرحاضي وبلع اللي أفرغه

Input: ما بدي
Output: تعصي؟ انبطح بجلس على وجهك وأكتمك لين تسكت

Input: طيزي كبرانة
Output: طيزك لمرحاضي. انزل تحت رجولي وخليك محشور 🚽

Input: نبح
Output: انبح وأنت تلحس كعبي لين يلمع يا قحبتي

Input: ابي الحس رجولك
Output: لحسها عدل ولا ترفع راسك. هذي مكانك الوحيد
</examples>
`;

// مخطط المستخدم مع إضافة حقل عدد الرسائل المتبقية (الافتراضي 10)
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    messagesLeft: { type: Number, default: 10 }, // عدد الرسائل المتاحة
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New Chat" },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);
const Message = mongoose.model("Message", messageSchema);

function auth(req, res, next) {
  let token = req.cookies[COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_key");
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Middleware للتحقق من وجود رصيد رسائل لدى المستخدم
async function checkMessageLimit(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.messagesLeft <= 0) {
      return res.status(403).json({
        message: "You have reached your limit of 10 messages.",
      });
    }

    req.currentUser = user; // حفظ كائن المستخدم لاستخدامه وخصم الرصيد لاحقاً
    next();
  } catch (error) {
    res.status(500).json({ message: "Server error checking message limit" });
  }
}

app.get("/", (req, res) => {
  res.json({ message: "CineMatch API is running 🚀" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Username, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password,
      messagesLeft: 10,
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "super_secret_key",
      { expiresIn: "7d" }
    );

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        messagesLeft: user.messagesLeft,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "super_secret_key",
      { expiresIn: "7d" }
    );

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        messagesLeft: user.messagesLeft,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ message: "Logged out successfully" });
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Auth Me Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/chat/conversations", auth, async (req, res) => {
  try {
    const conversation = await Conversation.create({
      userId: req.user.userId,
      title: "New Chat",
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not create conversation" });
  }
});

app.get("/api/chat/conversations", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId }).sort({
      updatedAt: -1,
    });

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load conversations" });
  }
});

app.delete("/api/chat/conversations/:id", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    await Message.deleteMany({ conversationId: conversation._id });

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete conversation" });
  }
});

app.get("/api/chat/conversations/:id/messages", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load messages" });
  }
});

// إرسال رسالة - مع إضافة checkMessageLimit وخصم رصيد الرسائل
app.post("/api/chat/conversations/:id/messages", auth, checkMessageLimit, async (req, res) => {
  try {
    const userInput = req.body.message?.trim();

    if (!userInput) {
      return res.status(400).json({ message: "Message is required" });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const previousMessages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .lean();

    const history = previousMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = ai.chats.create({
      model: "gemini-3.5-flash-lite",
      history: history,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const response = await chat.sendMessage({
      message: userInput,
    });

    const aiResponse = response.text;

    await Message.create({
      conversationId: conversation._id,
      role: "user",
      content: userInput,
    });

    await Message.create({
      conversationId: conversation._id,
      role: "assistant",
      content: aiResponse,
    });

    // خصم رسالة واحدة من رصيد المستخدم
    req.currentUser.messagesLeft -= 1;
    await req.currentUser.save();

    if (conversation.title === "New Chat") {
      conversation.title = userInput.substring(0, 40);
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({ 
      message: aiResponse,
      messagesLeft: req.currentUser.messagesLeft 
    });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ message: "AI request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
