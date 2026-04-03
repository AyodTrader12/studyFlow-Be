"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/reminders.ts
const express_1 = require("express");
const Auth_js_1 = require("../middleware/Auth.js");
const Reminder_js_1 = __importDefault(require("../models/Reminder.js"));
const router = (0, express_1.Router)();
router.get("/", Auth_js_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reminders = yield Reminder_js_1.default.find({ userId: req.user._id }).sort({ date: 1, time: 1 });
        res.json({ reminders });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to fetch reminders." });
    }
}));
router.post("/", Auth_js_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, date, time } = req.body;
        if (!text || !date) {
            res.status(400).json({ message: "Text and date are required." });
            return;
        }
        const reminder = yield Reminder_js_1.default.create({ userId: req.user._id, text, date, time: time !== null && time !== void 0 ? time : "08:00" });
        res.status(201).json({ message: "Reminder created.", reminder });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to create reminder." });
    }
}));
router.delete("/:id", Auth_js_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reminder = yield Reminder_js_1.default.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!reminder) {
            res.status(404).json({ message: "Reminder not found." });
            return;
        }
        res.json({ message: "Reminder deleted." });
    }
    catch (_a) {
        res.status(500).json({ message: "Failed to delete reminder." });
    }
}));
exports.default = router;
