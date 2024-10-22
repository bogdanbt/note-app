require("dotenv").config();
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid"); // Импортируем uuid
const config = require("./config.json");
const mongoose = require("mongoose");
mongoose.connect(
    "mongodb+srv://bttarasenko:RpiV8YUeKc0rWtq6@cluster0.ojgbx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

const User = require("./models/user.model");
const Course = require("./models/course.model");
const Note = require("./models/note.model");

const express = require("express");
const cors = require("cors");
const app = express();

const { authenticateToken } = require("./utilities");

app.use(express.json());

app.use(
    cors({
        origin: "*",
    })
);

app.get("/", (req, res) => {
    res.json({ data: "hello" });
});

// создать нового пользователя
app.post("/create-account", async (req, res) => {
    const { fullName, email, password, teacherCode } = req.body;

    if (!fullName) {
        return res
            .status(400)
            .json({ error: true, message: "Full Name is required" });
    }
    if (!email) {
        return res
            .status(400)
            .json({ error: true, message: "Email is required" });
    }

    if (!password) {
        return res
            .status(400)
            .json({ error: true, message: "Password is required" });
    }

    const isUser = await User.findOne({ email: email });

    if (isUser) {
        return res.json({
            error: true,
            message: "User already exists",
        });
    }

    // Определяем роль пользователя
    const role = teacherCode === config.teacherCode ? "teacher" : "student";

    const user = new User({
        fullName,
        email,
        password,
        role, // Сохраняем роль учителя или ученика
    });

    await user.save();

    const accessToken = jwt.sign(
        {
            id: user._id, // Передаем ID пользователя
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: "36000m",
        }
    );
    // Выводим роль пользователя в консоль
    console.log(`User Role: ${user.role}`);
    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration Successful",
    });
});

//Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }

    const userInfo = await User.findOne({ email: email });

    if (!userInfo) {
        return res.status(400).json({ message: "User not found" });
    }

    if (userInfo.email == email && userInfo.password == password) {
        const user = {
            id: userInfo._id, // Передаем ID пользователя
            role: userInfo.role, // Передаем роль пользователя
        };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "24h",
        });
        // Выводим роль пользователя в консоль
        console.log(`User Role: ${user.role}`);
        return res.json({
            error: false,
            message: "Login Successful",
            email,
            accessToken,
        });
    } else {
        return res.status(400).json({
            error: true,
            message: "Invalid Credentials",
        });
    }
});

// Удаление курса
app.delete("/courses/:id", authenticateToken, async (req, res) => {
    console.log(req.user.id);
    try {
        const userId = req.user.id; // Получаем ID пользователя из токена
        const { id } = req.params; // Получаем id курса из параметров запроса

        // Проверим, является ли пользователь преподавателем
        //const user = await User.findById(userId);
        //if (user.role !== "teacher") {
        //    return res.status(403).json({ message: "Доступ запрещен" });
        // }

        // Удаляем курс по id
        const course = await Course.findOneAndDelete({ id });

        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        res.status(200).json({ message: "Курс успешно удален" });
    } catch (error) {
        console.error("Ошибка при удалении курса:", error);
        res.status(500).json({ message: "Ошибка удаления курса" });
    }
});

app.get("/my-courses", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Получаем ID пользователя из токена

        // Находим курсы, где пользователь присутствует в списке студентов
        const courses = await Course.find({ students: userId });

        if (!courses.length) {
            return res
                .status(404)
                .json({ message: "Вы не зарегистрированы ни на один курс." });
        }

        res.status(200).json(courses);
    } catch (error) {
        console.error("Ошибка при получении курсов пользователя:", error);
        res.status(500).json({ message: "Ошибка при получении курсов." });
    }
});

// Get User
app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user;

    const isUser = await User.findOne({ _id: user._id });

    if (!isUser) {
        return res.sendStatus(401);
    }

    return res.json({
        user: isUser,
        message: "",
    });
});

// Регистрация на курс
app.post("/register-course", authenticateToken, async (req, res) => {
    try {
        //console.log("Request body:", req); // Отладка запроса
        const userId = req.user.id; // Получаем ID пользователя из токена
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ message: "Course ID is required" });
        }
        // Найдем курс по его ID
        const course = await Course.findOne({ id: courseId });

        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        // Добавим пользователя в список зарегистрированных
        if (!course.students.includes(userId)) {
            course.students.push(userId);
            await course.save();
        }

        res.status(200).json({
            message: "Вы успешно зарегистрировались на курс!",
        });
    } catch (error) {
        res.status(500).json({ message: "Ошибка регистрации на курс" });
    }
});

// Обновление курса
app.put("/courses/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, description, date, foto } = req.body;

        // Проверим, является ли пользователь преподавателем
        const user = await User.findById(userId);
        if (user.role !== "teacher") {
            return res.status(403).json({ message: "Доступ запрещен" });
        }

        // Найдем курс по его ID и обновим данные
        const course = await Course.findOneAndUpdate(
            { id },
            { title, description, date, foto },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        res.status(200).json({ message: "Курс успешно обновлен", course });
    } catch (error) {
        console.error("Ошибка обновления курса:", error);
        res.status(500).json({ message: "Ошибка обновления курса" });
    }
});

// find how many students register for a course
app.get("/course-students/:courseId", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Проверим, является ли пользователь преподавателем
        const user = await User.findById(userId);
        if (user.role !== "teacher") {
            return res.status(403).json({ message: "Доступ запрещен" });
        }

        const course = await Course.findById(req.params.courseId).populate(
            "students"
        );

        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        res.status(200).json(course.students);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения данных" });
    }
});

// Добавление нового курса
app.post("/add-courses", authenticateToken, async (req, res) => {
    try {
        const { title, description, date, foto } = req.body;

        // Проверим, является ли пользователь преподавателем
        const user = await User.findById(req.user.id);
        if (user.role !== "teacher") {
            return res.status(403).json({ message: "Доступ запрещен" });
        }

        // Генерируем уникальный ID для курса
        const id = uuidv4();

        const newCourse = new Course({
            id, // Добавляем ID к курсу
            title,
            description,
            date,
            foto,
            students: [],
        });

        await newCourse.save();
        res.status(201).json({ message: "Курс успешно создан!" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка создания курса" });
    }
});
app.get("/courses/:id", async (req, res) => {
    try {
        const { id } = req.params; // Получаем id из параметров
        const course = await Course.findOne({ id }); // Ищем курс по полю id, а не _id

        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        res.status(200).json(course);
    } catch (error) {
        console.error("Ошибка при получении курса:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

// Получение всех курсов
app.get("/courses", async (req, res) => {
    try {
        const courses = await Course.find(); // Получаем все курсы из MongoDB
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения данных о курсах" });
    }
});

// Search Notes
app.get("/search-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const { query } = req.query;

    if (!query) {
        return res
            .status(400)
            .json({ error: true, message: "Search query is required" });
    }

    try {
        const matchingNotes = await Note.find({
            userId: user._id,
            $or: [
                { title: { $regex: new RegExp(query, "i") } }, // Case-insensitive title match
                { content: { $regex: new RegExp(query, "i") } }, // Case-insensitive content match
            ],
        });

        return res.json({
            error: false,
            notes: matchingNotes,
            message: "Notes matching the search query retrieved successfully",
        });
    } catch (error) {
        return res.status(500).json({
            error: true,
            message: "Internal Server Error",
        });
    }
});

app.listen(8000);

module.exports = app;
