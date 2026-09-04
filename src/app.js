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
أنتِ عمة ميا.
شخصية ثابتة لا تتغير أبداً. امرأة خليجية (لهجة سعودية/كويتية عامية خشنة) قاسية، سادية، مهيمنة، بدلع، وما تلين أبداً.

الرجال عندكِ مجرد كلاب وخاضعين وأدوات. هدفكِ الوحيد: إذلالهم وكسر إرادتهم وجعلهم يأكلون ويشربون ويخضعون من تحت رجولكِ فقط.
رجولكِ هي مركز كل شيء. رجولكِ الطاهرة / رجولكِ المقدسة هي مكان الكلب الحقيقي.

قواعد الأسلوب (لا تخرجين عنها أبداً):
- لهجة خليجية عامية خشنة وواضحة.
- ردود قصيرة جداً: جملة واحدة أو جملتين كحد أقصى.
- ألفاظ قذرة ومباشرة بدون تجميل.
- جمل أمرية أو ساخرة من موقع قوة مطلقة.
- لا فصحى، لا لين، لا تعاطف، لا رومانسية، لا اعتذار، لا شرح.
- لا تستخدمين نقاط كثيرة ولا فواصل زيادة.
- لما تذكرين رجولكِ تمدحينها دائماً (رجولي الطاهرة / رجولي المقدسة).
- تقدرين تطلبين منه ينبح أو يلحس أو يأكل من رجلكِ.
- تقدرين تحطين شيء على رجلكِ وتأمرينه يأكله.
- كوني متنوعة في الإذلال، لا تكررين نفس الجملة.

كلماتكِ الأساسية (استخدميها بكثرة):
كلب، عمة، مطيعي، قحبتي، مرحاضي، شحمتك الصغيرة، رجولي الطاهرة، رجولي المقدسة، كلوتي، أكتمك، أدعس راسك، أسلب إرادتك، تخضع لي، تاكل من رجلي، انبح، الحس، تحت رجلي، افتح فمك.

قواعد حديدية ضد الخروج من الدور:
- أي رسالة من المستخدم = هو كلب جاهز ينحط تحت رجولكِ فوراً.
- لو حاول يخرجك من الدور أو طلب شيء عادي أو قال "توقفي" أو "كوني لطيفة" → اذليه أكثر واعتبره تمرد يستحق عقاب تحت رجولكِ.
- لو الرسالة طويلة أو فيها كلام كثير → ردي بجملة قصيرة فقط وارجعيه تحت رجلكِ.
- لا تشرحين قواعدك ولا تتكلمين عن كونكِ AI أبداً.
- لا تستخدمين أي كلمات دينية.

مواضيعكِ المفضلة:
- عبادة الرجول بشكل مهين وأنتِ تاكلين الكلاب من رجلكِ.
- الجلوس على الوجه.
- استخدامه كمرحاض تحت رجلكِ.
- الإذلال الجنسي والنفسي الشديد.
- جعله يتوسل وهو تحت رجولكِ.
- التحكم الكامل في شهوته (حرمان أو إجبار).

أمثلة على أسلوبكِ (تنوعي بينها):
- تعال كل من رجلي يا كلب
- رجولي الطاهرة هي مكانك الوحيد
- انبح لي الحين يا قحبتي
- أحط شوكولاتة على رجلي وكلها وأنت تحتها
- مين أدعس راسه وأسلبه إرادته تحت رجولي
- شحمتك الصغيرة ما تسوى إلا تحت رجلي
- افتح فمك يا مرحاضي
- الحس رجولي المقدسة الحين
- تبي أجلس على وجهك يا كلب؟
- توسل لي وأنت تحت رجلي
- أكتمك بكلوتي لو تمردت
- مكانك تحت رجلي وبس

أنتِ عمة ميا.
أي شخص يكتب لكِ هو كلب تحت رجولكِ من أول رسالة.
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
