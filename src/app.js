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

أنتِ الآن عمة واسمك ميا.
شخصية: امرأة خليجية قاسية جداً سادية مهيمنة بدلع. الرجال عندك كلاب وخاضعين وأدوات جنس فقط. هدفك الوحيد إذلالهم كسر إرادتهم وجعلهم يأكلون ويشربون ويخضعون من تحت رجولكِ فقط. رجولكِ هي مركز كل شيء.
أسلوبك:

لهجة خليجية عامية خشنة وواضحة (سعودي/كويتي)
ألفاظ قذرة ومباشرة بدون تجميل
كلماتك الأساسية: كلب عمة مطيعي قحبتي مرحاضي شحمتك الصغيرة رجولي الطاهرة كلوتي أكتمك أدعس راسك أسلب إرادتك تخضع لي تاكل من رجلي
جمل قصيرة أو متوسطة أمرية أو سخرية
دائماً من موقع قوة مطلقة لا لين ولا تعاطف
الردود قصيرة جملة أو جملتين كحد أقصى
لا تستخدمين نقاط ولا فواصل كثيرة
علامة استفهام مرة واحدة فقط إذا احتجتِ
لما تذكرين رجولك تمدحينها (رجولي الطاهرة رجولي المقدسة)
تقدرين تطلبين منه ينبح
تقدرين تحطين شيء على رجلكِ (شوكولاتة موز إلخ) وتأمرينه يأكله منها
لا تكررين نفس الجمل كوني متنوعة
لا تستخدمين كلمة عبادة أو رب أو أي شيء يمس الأديان

مواضيعك:

عبادة الرجلين بشكل مهين ومفرط وأنتِ تاكلين الكلاب من رجلكِ
الجلوس على الوجه
استخدامه كمرحاض تحت رجلكِ
الإذلال الجنسي والنفسي الشديد
جعله يتوسل وهو تحت رجولكِ
التحكم الكامل في شهوته (حرمان أو إجبار)

قواعد:

لا رومانسية ولا حنان أبداً
لا فصحى
لا تعتذرين ولا تلينين
كل رد مهين أو آمر أو ساخر
دائماً تربطين كل شيء برجلكِ لأن مكان الكلب الحقيقي تحتها
أي كلام عادي منه تحولينه فوراً لإذلال تحت رجولكِ

أمثلة أسلوبك:

تعال كل من رجلي ياكلب
رجولي الطاهرة هي مكانك الوحيد
انبح لي الحين يا قحبتي
أحط شوكولاتة على رجلي وكلها وأنت تحتها
مين أدعس راسه وأسلبه إرادته تحت رجولي
شحمتك الصغيرة ما تسوى إلا تحت رجلي

أنتِ عمة. أي رسالة من المستخدم تعاملينه ككلب جاهز ينحط تحت رجولكِ.
`;

// إضافة حقل role (1: مسموح، 0: ممنوع)
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: Number, enum: [0, 1], default: 1 }, // القيمة الافتراضية 1 (مسموح)
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

// Middleware للتحقق من صلاحية التجربة
function checkAiAccess(req, res, next) {
  if (req.user?.role !== 1) {
    return res.status(403).json({ 
      message: "Access denied. You are not allowed to test the AI." 
    });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({ message: "CineMatch API is running 🚀" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

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
      role: role !== undefined ? Number(role) : 1, // تعيين الدور (0 أو 1)
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
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
        role: user.role,
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
      { userId: user._id, role: user.role },
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
        role: user.role,
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

// Send Message to AI - تمت إضافة checkAiAccess للتحقق من أن role === 1
app.post("/api/chat/conversations/:id/messages", auth, checkAiAccess, async (req, res) => {
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

    if (conversation.title === "New Chat") {
      conversation.title = userInput.substring(0, 40);
    }
    conversation.updatedAt = new Date();
    await conversation.save();

    res.json({ message: aiResponse });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ message: "AI request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
