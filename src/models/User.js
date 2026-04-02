const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    // Phone is now optional but must be unique if provided.
    phone: {
        type: String,
        unique: true,
        sparse: true,
        set: v => (v === '' || v === null) ? undefined : v
    },
    password: { type: String, required: true },
    role: { type: String, default: 'user', enum: ['user', 'admin', 'owner'] },
    isAdminApproved: { type: Boolean, default: false },
    avatar: { type: String },
    avatarPublicId: { type: String },
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        language: { type: String, default: 'en' }
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);