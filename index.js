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
const Lesson = require("./models/lesson.model"); // замените путь на фактический путь к модели Lesson
const Payment = require("./models/payment.model");
const Voucher = require("./models/voucher.model");
const ReportBook = require("./models/reportBook.model"); // Import the ReportBook model
const express = require("express");
const cors = require("cors");
const app = express();

const { authenticateToken } = require("./utilities");

app.use(express.json());

app.use(
    cors({
        origin: "*",
        //origin: "https://fun-kids.netlify.app", // Укажите URL вашего фронтенда
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
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
            email: user.email, // Передаем email
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "36000m" }
    );

    return res.json({
        error: false,
        user,
        accessToken,
        message: "Registration Successful",
    });
});
// получения инфы о пользователе из его id
app.post("/students/info", authenticateToken, async (req, res) => {
    const { studentIds } = req.body; // Ожидаем массив ID студентов в запросе

    try {
        const students = await User.find(
            { email: { $in: studentIds } },
            "fullName email"
        );
        // Находим студентов по их ID и возвращаем только fullName и _id
        res.status(200).json(students);
    } catch (error) {
        console.error("Ошибка при получении данных студентов:", error);
        res.status(500).json({
            message: "Ошибка при получении данных студентов",
        });
    }
});

// Эндпоинт для проверки ваучера по email студента и ID курса
app.get("/vouchers", authenticateToken, async (req, res) => {
    const { email, courseId } = req.query;

    try {
        // Находим ваучер по email студента и courseId
        const voucher = await Voucher.findOne({
            userId: email,
            courseId: courseId,
        });

        // Возвращаем ваучер или пустой результат
        res.status(200).json({
            exists: !!voucher,
            voucher: voucher || null,
        });
    } catch (error) {
        console.error("Ошибка при проверке ваучера:", error);
        res.status(500).json({ message: "Ошибка при проверке ваучера" });
    }
});
// Эндпоинт для добавления студента в массив attendees
app.post(
    "/lessons/:lessonId/add-attendee",
    authenticateToken,
    async (req, res) => {
        const { lessonId } = req.params;
        const { studentEmail } = req.body;

        try {
            const lesson = await Lesson.findOne({ id: lessonId });
            if (!lesson) {
                return res.status(404).json({ message: "Урок не найден" });
            }

            // Проверка, добавлен ли уже студент в список участников
            if (!lesson.attendees.includes(studentEmail)) {
                // Добавляем только email студента в массив attendees
                lesson.attendees.push(studentEmail);
                await lesson.save();
            }

            res.status(200).json({
                message: "Студент успешно добавлен в список посещаемости",
            });
        } catch (error) {
            console.error(
                "Ошибка при добавлении студента в список посещаемости:",
                error
            );
            res.status(500).json({
                message: "Ошибка при добавлении студента в список посещаемости",
            });
        }
    }
);

// Эндпоинт для удаления одного ваучера
app.delete("/vouchers", authenticateToken, async (req, res) => {
    const { email, courseId } = req.body;

    try {
        // Удаляем один ваучер, соответствующий `email` и `courseId`
        const result = await Voucher.deleteOne({
            userId: email,
            courseId: courseId,
        });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: "Ваучер успешно удален" });
        } else {
            res.status(404).json({ message: "Ваучер не найден" });
        }
    } catch (error) {
        console.error("Ошибка при удалении ваучера:", error);
        res.status(500).json({ message: "Ошибка при удалении ваучера" });
    }
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
            email: userInfo.email, // Передаем email
            role: userInfo.role,
        };

        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "24h",
        });

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
    try {
        const userId = req.user.id; // ID текущего пользователя из токена
        const courseId = req.params.id; // ID курса, который нужно удалить

        // Найдите и удалите курс, если он существует и права доступа совпадают
        const deletedCourse = await Course.findOneAndDelete({
            id: courseId,
            $or: [
                { teacherId: userId }, // Удаляет, если пользователь — создатель курса
                { role: "admin" }, // Удаляет, если пользователь — администратор
            ],
        });

        if (!deletedCourse) {
            return res.status(404).json({
                message: "Курс не найден или у вас нет прав для его удаления",
            });
        }

        res.status(200).json({ message: "Курс успешно удален" });
    } catch (error) {
        console.log("Ошибка при удалении курса:", error);
        res.status(500).json({ message: "Ошибка удаления курса" });
    }
});

//const { v4: uuidv4 } = require("uuid"); // Импортируем библиотеку для генерации уникальных ID
//add lesson
// Добавление урока к курсу
app.post("/courses/:courseId/lessons", authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const { title, description, content, photo, lessonDate } = req.body;

    try {
        // Находим курс по courseId
        const course = await Course.findOne({ id: courseId });
        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        // Проверка прав пользователя — только создатель курса может добавлять уроки
        if (String(course.teacherId) !== String(req.user.id)) {
            console.log(
                "teacherId (из course):",
                typeof course.teacherId,
                course.teacherId
            );
            console.log("userId (из токена):", typeof req.user.id, req.user.id);
            return res.status(403).json({
                message: "У вас нет прав для добавления уроков к этому курсу",
            });
        }

        // Создаем новый урок
        const lessonId = uuidv4(); // Используем UUID для lessonId
        const newLesson = new Lesson({
            id: lessonId,
            title,
            description,
            content,
            photo,
            courseId: course.id,
            lessonDate,
        });

        await newLesson.save();

        // // Добавляем lessonId к массиву lessonIds курса как строку
        // course.lessonIds.push(lessonId); // Храните lessonId как строку
        await course.save();

        res.status(201).json(newLesson);
    } catch (error) {
        console.log("Ошибка при добавлении урока:", error);
        res.status(500).json({ message: "Ошибка при добавлении урока" });
    }
});
// Получение данных урока по его ID
app.get("/lessons/:lessonId", authenticateToken, async (req, res) => {
    const { lessonId } = req.params;

    try {
        const lesson = await Lesson.findOne({ id: lessonId });
        if (!lesson) {
            return res.status(404).json({ message: "Урок не найден" });
        }

        res.status(200).json(lesson);
    } catch (error) {
        console.error("Ошибка при получении урока:", error);
        res.status(500).json({ message: "Ошибка при получении урока" });
    }
});
// edit lesson
// edit lesson
app.put("/lessons/:lessonId", authenticateToken, async (req, res) => {
    const { lessonId } = req.params;
    const { title, description, content, photo, lessonDate } = req.body;

    try {
        const lesson = await Lesson.findOne({ id: lessonId });
        if (!lesson) {
            return res.status(404).json({ message: "Урок не найден" });
        }

        const course = await Course.findOne({ id: lesson.courseId });
        if (!course) {
            return res
                .status(404)
                .json({ message: "Курс не найден для данного урока" });
        }

        // Приводим course.teacherId и req.user.id к строкам для корректного сравнения
        console.log("Автор курса:", course.teacherId.toString());
        console.log("ID пользователя из токена:", req.user.id);

        if (course.teacherId.toString() !== req.user.id) {
            return res.status(403).json({
                message: "У вас нет прав для редактирования этого урока",
            });
        }

        lesson.title = title;
        lesson.description = description;
        lesson.content = content;
        lesson.photo = photo;
        lesson.lessonDate = lessonDate; // Обновление lessonDate
        await lesson.save();
        res.status(200).json(lesson);
    } catch (error) {
        console.error("Ошибка при редактировании урока:", error);
        res.status(500).json({ message: "Ошибка при редактировании урока" });
    }
});

//ендпоинт для отметки посещений
app.post(
    "/lessons/:lessonId/attendance",
    authenticateToken,
    async (req, res) => {
        const { lessonId } = req.params;
        const { studentId, attended } = req.body;

        try {
            const lesson = await Lesson.findOne({ id: lessonId });
            if (!lesson) {
                return res.status(404).json({ message: "Урок не найден" });
            }

            const course = await Course.findOne({ id: lesson.courseId });
            if (
                !course ||
                course.teacherId.toString() !== req.user.id.toString()
            ) {
                return res.status(403).json({
                    message: "У вас нет прав для изменения посещаемости",
                });
            }
            // Ищем или добавляем запись о посещаемости для студента
            const attendeeIndex = lesson.attendees.findIndex(
                (a) => a.studentId.toString() === studentId.toString()
            );
            if (attendeeIndex > -1) {
                lesson.attendees[attendeeIndex].attended = attended;
            } else {
                lesson.attendees.push({ studentId, attended });
            }

            await lesson.save();
            res.status(200).json({ message: "Посещаемость успешно обновлена" });
        } catch (error) {
            console.error("Ошибка при отметке посещаемости:", error);
            res.status(500).json({
                message: "Ошибка при отметке посещаемости",
            });
        }
    }
);

// удаляем отметку о посещении
app.delete(
    "/lessons/:lessonId/attendance/:studentId",
    authenticateToken,
    async (req, res) => {
        const { lessonId, studentId } = req.params;

        try {
            const lesson = await Lesson.findOne({ id: lessonId });
            if (!lesson) {
                return res.status(404).json({ message: "Урок не найден" });
            }

            const course = await Course.findOne({ id: lesson.courseId });
            if (
                !course ||
                course.teacherId.toString() !== req.user.id.toString()
            ) {
                return res.status(403).json({
                    message: "У вас нет прав для изменения посещаемости",
                });
            }

            // Удаляем отметку о посещаемости для данного студента
            lesson.attendees = lesson.attendees.filter(
                (a) => a.studentId !== studentId
            );

            await lesson.save();
            res.status(200).json({ message: "Посещаемость успешно удалена" });
        } catch (error) {
            console.error("Ошибка при удалении посещаемости:", error);
            res.status(500).json({
                message: "Ошибка при удалении посещаемости",
            });
        }
    }
);

// Эндпоинт для удаления урока
app.delete(
    "/courses/:courseId/lessons/:lessonId",
    authenticateToken,
    async (req, res) => {
        try {
            const { courseId, lessonId } = req.params;

            // Находим курс по ID
            const course = await Course.findOne({ id: courseId });
            if (!course) {
                return res.status(404).json({ message: "Курс не найден" });
            }

            // Проверяем, существует ли урок в массиве lessonIds курса
            const lessonIndex = course.lessonIds.indexOf(lessonId);
            if (lessonIndex === -1) {
                return res.status(404).json({ message: "Урок не найден" });
            }

            // Удаляем урок из коллекции Lesson
            await Lesson.deleteOne({ id: lessonId });

            // Удаляем ID урока из массива lessonIds курса
            course.lessonIds.splice(lessonIndex, 1);
            await course.save();

            res.status(200).json({ message: "Урок успешно удален" });
        } catch (error) {
            console.error("Ошибка при удалении урока:", error);
            res.status(500).json({ message: "Ошибка при удалении урока" });
        }
    }
);

// Курсы, где текущий пользователь - студент
app.get("/courses/student", authenticateToken, async (req, res) => {
    try {
        console.log(req);
        const courses = await Course.find({
            students: { $in: [req.user.email] },
        });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения курсов" });
    }
});

// Курсы, где текущий пользователь - учитель
app.get("/courses/teacher", authenticateToken, async (req, res) => {
    try {
        const courses = await Course.find({ teacherId: req.user.id });
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: "Ошибка получения курсов" });
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
        const { courseId } = req.body; // Принимаем только ID курса из тела запроса
        const email = req.user.email; // Получаем email из токена через middleware authenticateToken

        console.log("Получен запрос на регистрацию с данными:", {
            email,
            courseId,
        });

        if (!email || !courseId) {
            return res
                .status(400)
                .json({ message: "Email и Course ID обязательны" });
        }

        // Находим курс по его ID
        const course = await Course.findOne({ id: courseId.toString() });
        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        // Проверяем, есть ли email уже в списке зарегистрированных
        if (!course.students.includes(email)) {
            course.students.push(email); // Добавляем email вместо userId
            await course.save();
            console.log("Email добавлен:", email);
        } else {
            console.log("Пользователь уже зарегистрирован на курс.");
        }

        res.status(200).json({
            message: "Вы успешно зарегистрировались на курс!",
        });
    } catch (error) {
        console.log("Ошибка при регистрации:", error);
        res.status(500).json({ message: "Ошибка регистрации на курс" });
    }
});

// Обновление курса
app.put("/courses/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id; // Текущий пользователь
    const userRole = req.user.role; // Роль пользователя (admin, teacher)

    try {
        const course = await Course.findOne({ id });
        console.log(course);
        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        // Проверка прав редактирования
        if (userRole !== "admin" && course.teacherId.toString() !== userId) {
            return res
                .status(403)
                .json({ message: "Нет прав для редактирования" });
        }

        const { title, description, date, foto } = req.body;
        course.title = title;
        course.description = description;
        course.date = date;
        course.foto = foto;

        await course.save();
        res.status(200).json({ message: "Курс успешно обновлен" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка редактирования курса" });
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
        const { title, description, date, foto, teacherId } = req.body;

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
            teacherId,
            students: [],
        });

        await newCourse.save();
        res.status(201).json({ message: "Курс успешно создан!" });
    } catch (error) {
        res.status(500).json({ message: "Ошибка создания курса" });
    }
});
// Проверка уникальности названия курса
app.post("/check-course-title", authenticateToken, async (req, res) => {
    try {
        const { title } = req.body;
        const existingCourse = await Course.findOne({ title });

        if (existingCourse) {
            return res.json({ isUnique: false });
        }

        res.json({ isUnique: true });
    } catch (error) {
        res.status(500).json({ message: "Ошибка при проверке названия курса" });
    }
});

app.get("/courses/:id", async (req, res) => {
    try {
        const courseId = req.params.id;

        // Находим курс по ID
        const course = await Course.findOne({ id: courseId });
        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        // Получаем все уроки, связанные с курсом
        const lessons = await Lesson.find({ courseId: courseId });

        res.status(200).json({
            ...course.toObject(), // Конвертируем документ курса в объект
            lessons, // Добавляем уроки
        });
    } catch (error) {
        console.error("Ошибка при получении курса:", error);
        res.status(500).json({ message: "Ошибка при получении курса" });
    }
});

/// Получение списка всех студентов с их именами и email
app.get("/students/list", async (req, res) => {
    try {
        // Получаем всех студентов и возвращаем fullName и email
        const students = await User.find({ role: "student" }, "fullName email");
        res.status(200).json(students);
    } catch (error) {
        console.error("Ошибка при получении списка студентов:", error);
        res.status(500).json({
            message: "Ошибка при получении списка студентов",
        });
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

// Получение списка всех курсов
app.get("/courses/list", authenticateToken, async (req, res) => {
    try {
        // Проверяем, что пользователь имеет права администратора
        const user = await User.findById(req.user.id);
        if (user.role !== "admin") {
            return res.status(403).json({ message: "Доступ запрещен" });
        }

        const courses = await Course.find({}, "title _id");
        res.status(200).json(courses);
    } catch (error) {
        console.error("Ошибка при получении списка курсов:", error);
        res.status(500).json({ message: "Ошибка при получении списка курсов" });
    }
});
app.post("/admin/payment", async (req, res) => {
    try {
        console.log("Данные, полученные на сервере:", req.body);

        const {
            userId,
            courseId,
            amount,
            numberOfVouchers,
            paymentMethod,
            paymentDate,
        } = req.body;
        // Расчет суммы для каждого ваучера
        const voucherAmount = amount / numberOfVouchers;
        // Создание записи о платеже
        const payment = new Payment({
            userId,
            courseId,
            amount,
            numberOfVouchers,
            paymentMethod,
            paymentDate,
            description: `Оплата за ${numberOfVouchers} ваучеров для курса ${courseId}`,
        });

        await payment.save();

        // Создание ваучеров
        for (let i = 0; i < numberOfVouchers; i++) {
            await Voucher.create({
                userId,
                courseId,
                amount: voucherAmount, // Используем рассчитанное значение

                description: "Оплаченный ваучер",
            });
        }
        res.status(201).json({
            message: "Платеж обработан и ваучеры созданы",
            payment,
        });
    } catch (error) {
        console.error("Ошибка при обработке платежа:", error);
        res.status(500).json({ message: "Ошибка при обработке платежа" });
    }
});

// app.get("/students/details", async (req, res) => {
//     try {
//         const students = await User.find({ role: "student" });

//         const studentDetails = await Promise.all(
//             students.map(async (student) => {
//                 const courses = await Course.find(); // Получаем все курсы
//                 const courseStats = await Promise.all(
//                     courses.map(async (course) => {
//                         const attendedLessons = await Lesson.countDocuments({
//                             courseId: course._id,
//                             "attendees.studentId": student._id,
//                             "attendees.attended": true,
//                         });

//                         const totalVouchers = await Voucher.countDocuments({
//                             userId: student._id,
//                             courseId: course._id,
//                         });

//                         return {
//                             courseId: course._id,
//                             courseTitle: course.title,
//                             attendedLessons,
//                             totalVouchers,
//                         };
//                     })
//                 );

//                 return {
//                     ...student._doc,
//                     courseStats,
//                 };
//             })
//         );

//         res.status(200).json(studentDetails);
//     } catch (error) {
//         console.error("Ошибка при получении данных студентов:", error);
//         res.status(500).json({
//             message: "Ошибка при получении данных студентов",
//         });
//     }
// });

app.get("/students/details", async (req, res) => {
    try {
        // Получение всех студентов
        const students = await User.find({ role: "student" }).select(
            "fullName email"
        );
        console.log(students);
        const studentDetails = await Promise.all(
            students.map(async (student) => {
                // Получение курсов, где зарегистрирован студент
                const courses = await Course.find({
                    students: student.email,
                }).select("title id");
                console.log(courses);
                // Подготовка статистики по каждому курсу
                const courseStats = await Promise.all(
                    courses.map(async (course) => {
                        // Подсчет посещенных уроков
                        // const attendedLessons = await Lesson.countDocuments({
                        //     courseId: course._id,
                        //     "attendees.studentId": student.email,
                        //     "attendees.attended": true,
                        // });

                        // Подсчет ваучеров на курс
                        const totalVouchers = await Voucher.countDocuments({
                            userId: student.email,
                            courseId: course.id,
                        });

                        console.log(course.id, course.title, totalVouchers);
                        return {
                            courseId: course.id,
                            courseTitle: course.title,
                            // attendedLessons,
                            totalVouchers,
                        };
                    })
                );

                return {
                    fullName: student.fullName,
                    email: student.email,
                    courses: courseStats,
                };
            })
        );

        res.status(200).json(studentDetails);
    } catch (error) {
        console.error("Ошибка при получении информации о студентах:", error);
        res.status(500).json({
            message: "Ошибка при получении информации о студентах",
        });
    }
});
/////////тест передачи числа
// app.post("/echo-number", (req, res) => {
//     const { number } = req.body;

//     if (typeof number !== "number") {
//         return res
//             .status(400)
//             .json({ message: "Передано неверное значение, ожидается число" });
//     }

//     res.status(200).json({ number });
// });

// // тест передачи даты
// app.post("/generate-dates", (req, res) => {
//     const { start, end } = req.body;

//     if (!start || !end) {
//         return res
//             .status(400)
//             .json({ message: "Обе даты (start и end) обязательны" });
//     }

//     const startDate = new Date(start);
//     const endDate = new Date(end);

//     if (startDate > endDate) {
//         return res
//             .status(400)
//             .json({
//                 message:
//                     "Дата начала должна быть меньше или равна дате окончания",
//             });
//     }

//     const dateList = [];
//     let currentDate = new Date(startDate);

//     while (currentDate <= endDate) {
//         dateList.push(new Date(currentDate)); // Добавляем копию текущей даты
//         currentDate.setDate(currentDate.getDate() + 1); // Переход к следующему дню
//     }

//     res.status(200).json({ dates: dateList });
// });

/// возврат имени урока
//const Lesson = require("./models/lesson.model"); // Импортируйте модель урока

app.post("/generate-dates", async (req, res) => {
    const { start, end } = req.body;

    if (!start || !end) {
        return res
            .status(400)
            .json({ message: "Обе даты (start и end) обязательны" });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) {
        return res.status(400).json({
            message: "Дата начала должна быть меньше или равна дате окончания",
        });
    }

    try {
        // Ищем уроки, которые попадают в указанный диапазон дат
        const lessons = await Lesson.find({
            lessonDate: { $gte: startDate, $lte: endDate },
        }).select("title lessonDate"); // Возвращаем только поля title и lessonDate

        res.status(200).json({ lessons });
    } catch (error) {
        console.error("Ошибка при получении уроков:", error);
        res.status(500).json({ message: "Ошибка при получении уроков" });
    }
});
app.get("/reportbook/by-date-range", authenticateToken, async (req, res) => {
    const { startDate, endDate } = req.query;

    console.log("Получен запрос на отчеты с датами:", startDate, endDate); // Проверка входящих данных

    try {
        // Убедитесь, что даты корректно передаются
        if (!startDate || !endDate) {
            return res
                .status(400)
                .json({ message: "Необходимо указать даты начала и конца" });
        }

        // Поиск отчетов в базе данных
        const reports = await ReportBook.find({
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            },
        });

        // console.log("Найденные отчеты:", reports); // Проверка данных, найденных в базе
        // Получаем уникальные courseId для поиска названий курсов
        const courseIds = [
            ...new Set(reports.map((report) => report.courseId)),
        ];
        const userIds = [...new Set(reports.map((report) => report.userId))];
        console.log(userIds);
        // Находим названия курсов по их courseId
        const courses = await Course.find({ id: { $in: courseIds } });
        const users = await User.find({ email: { $in: userIds } });
        console.log(users);
        // Создаем словарь courseId -> title для быстрой подстановки
        const courseTitles = {};
        courses.forEach((course) => {
            courseTitles[course.id] = course.title;
        });
        const userFullName = {};
        users.forEach((user) => {
            userFullName[user.email] = user.fullName;
        });
        console.log(userFullName);
        // Добавляем названия курсов в отчеты
        const formattedReports = reports.map((report) => ({
            ...report._doc,
            courseTitle: courseTitles[report.courseId] || "Unknown Course",
            userFullName: userFullName[report.userId] || "Unknown Course",
        }));

        res.status(200).json(formattedReports);
        // res.status(200).json(reports);
    } catch (error) {
        console.error("Ошибка при получении отчетов:", error);
        res.status(500).json({ message: "Ошибка при получении отчетов" });
    }
});

/// Route to get lessons by month without authentication
// app.get("/lessons/by-month", async (req, res) => {

//     console.log("Request received for lessons by month:", req.query);

//     const { year, month } = req.query;
//     if (!year || !month) {
//         console.log("Missing year or month in request");
//         return res.status(400).json({ message: "Укажите год и месяц" });
//     }

//     try {
//         // const startDate = new Date(year, month - 1, 1);
//         // const endDate = new Date(year, month, 0, 23, 59, 59);
//         // console.log("Searching lessons between:", startDate, "and", endDate);
//         console.log("hi");
//         // const lessons = await Lesson.find({
//         //     lessonDate: { $gte: startDate, $lte: endDate },
//         // }).populate("courseId", "title");

//         // console.log("Found lessons:", lessons);

//         // const lessonDetails = lessons.map((lesson) => {
//         //     const attendeesCount = lesson.attendees.filter(
//         //         (attendee) => attendee.attended
//         //     ).length;
//         //     return {
//         //         lessonId: lesson.id,
//         //         title: lesson.title,
//         //         courseTitle: lesson.courseId ? lesson.courseId.title : "N/A",
//         //         lessonDate: lesson.lessonDate,
//         //         attendeesCount: attendeesCount,
//         //     };
//         // });

//         res.status(200).json(lessonDetails);
//     } catch (error) {
//         console.error("Ошибка при получении уроков по месяцу:", error);
//         res.status(500).json({
//             message: "Ошибка при получении уроков по месяцу",
//         });
//     }
// });

//импорт базы данных в монго из файла

// Endpoint to import multiple courses
app.post("/import-courses", async (req, res) => {
    const { courses } = req.body; // Expecting an array of course objects

    if (!courses || !Array.isArray(courses)) {
        return res.status(400).json({ message: "Invalid data format" });
    }

    try {
        const importedCourses = [];
        for (const courseData of courses) {
            const newCourse = new Course({
                id: courseData.id,
                title: courseData.title,
                description: courseData.description,
                foto: courseData.foto,
                teacherId: courseData.teacherId || null,
                students: courseData.students || [],
                lessonIds: courseData.lessonIds || [],
            });

            await newCourse.save();
            importedCourses.push(newCourse);
        }

        res.status(201).json({
            message: "Courses imported successfully",
            courses: importedCourses,
        });
    } catch (error) {
        console.error("Error importing courses:", error);
        res.status(500).json({ message: "Error importing courses" });
    }
});

app.post("/import/users", async (req, res) => {
    try {
        const { users } = req.body; // Ожидается, что данные будут переданы в формате { users: [...] }

        if (!users || !Array.isArray(users)) {
            return res.status(400).json({
                message:
                    "Неверный формат данных. Ожидается массив пользователей.",
            });
        }

        // Сохранение каждого пользователя
        for (const userData of users) {
            const newUser = new User({
                fullName: userData.fullName,
                email: userData.email,
                password: userData.password, // Убедитесь, что пароль безопасно передается и хранится (например, хеширование)
                role: userData.role || "student", // По умолчанию роль — "student"
            });

            await newUser.save();
        }

        res.status(201).json({
            message: "Пользователи успешно загружены в базу данных",
        });
    } catch (error) {
        console.error("Ошибка при загрузке данных пользователей:", error);
        res.status(500).json({
            message: "Ошибка при загрузке данных пользователей",
        });
    }
});

app.post("/import-lessons", async (req, res) => {
    const { lessons } = req.body; // Ожидаем массив объектов уроков в формате { lessons: [...] }

    // Проверка формата данных
    if (!lessons || !Array.isArray(lessons)) {
        console.log("Invalid data format received:", req.body);
        return res.status(400).json({ message: "Invalid data format" });
    }

    try {
        const importedLessons = [];
        for (const lessonData of lessons) {
            const newLesson = new Lesson({
                id: lessonData.id,
                title: lessonData.title,
                description: lessonData.description,
                content: lessonData.content,
                courseId: lessonData.courseId,
                photo: lessonData.photo || null,
                lessonDate: lessonData.lessonDate,
                attendees: lessonData.attendees || [],
            });

            await newLesson.save();
            importedLessons.push(newLesson);
        }

        res.status(201).json({
            message: "Lessons imported successfully",
            lessons: importedLessons,
        });
    } catch (error) {
        console.error("Error importing lessons:", error);
        res.status(500).json({ message: "Error importing lessons" });
    }
});

//////админ добавление детей на курс
// app.post("/courses/:courseId/add-students", async (req, res) => {
//     const { courseId } = req.params;
//     const { studentIds } = req.body; // Ожидаем массив ID студентов

//     try {
//         const course = await Course.findOne({ id: courseId });
//         if (!course) {
//             return res.status(404).json({ message: "Курс не найден" });
//         }

//         // Добавляем только тех студентов, которых еще нет в списке
//         studentIds.forEach((studentId) => {
//             if (!course.students.includes(studentId)) {
//                 course.students.push(studentId);
//             }
//         });

//         await course.save();
//         res.status(200).json({
//             message: "Студенты успешно добавлены к курсу",
//             students: course.students,
//         });
//     } catch (error) {
//         console.error("Ошибка при добавлении студентов:", error);
//         res.status(500).json({ message: "Ошибка при добавлении студентов" });
//     }
// });
app.post("/courses/:courseId/add-students", async (req, res) => {
    const { courseId } = req.params;
    const { studentIds } = req.body; // Здесь ожидаем массив email студентов

    try {
        const course = await Course.findOne({ id: courseId });
        if (!course) {
            return res.status(404).json({ message: "Курс не найден" });
        }

        console.log("Полученные studentIds (emails):", studentIds); // Отладка

        // Для каждого email находим студента и добавляем в курс, если его еще нет
        for (const email of studentIds) {
            if (!course.students.includes(email)) {
                course.students.push(email); // Добавляем email вместо ID
            }
        }

        await course.save();
        console.log("Обновленный список студентов в курсе:", course.students); // Отладка

        res.status(200).json({
            message: "Студенты успешно добавлены к курсу",
            students: course.students,
        });
    } catch (error) {
        console.error("Ошибка при добавлении студентов:", error);
        res.status(500).json({ message: "Ошибка при добавлении студентов" });
    }
});

// Endpoint to add an entry to ReportBook
app.post("/reportbook/add", authenticateToken, async (req, res) => {
    const {
        id,
        date,
        userId,
        courseId,
        lessonId,
        userRole,
        paymentStatus,
        amount,
    } = req.body;

    try {
        const reportEntry = new ReportBook({
            id,
            date,
            userId,
            courseId,
            lessonId,
            userRole,
            paymentStatus,
            amount,
        });

        await reportEntry.save();
        res.status(201).json({
            message: "Entry added to ReportBook successfully.",
        });
    } catch (error) {
        console.error("Error adding entry to ReportBook:", error);
        res.status(500).json({ message: "Error adding entry to ReportBook." });
    }
});

app.listen(8000);

module.exports = app;
