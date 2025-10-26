import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide a full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password by default in queries
    },
    phone: {
      type: String,
      default: null,
    },
    plan: {
      type: String,
      enum: ['Starter', 'Pro', 'Enterprise'],
      default: 'Starter',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    calendarService: {
      type: String,
      enum: [
        'Apple Calendar (macOS/iOS)',
        'Thunderbird (Lightning)',
        'Android (DAVx⁵)',
        'Evolution (GNOME)',
        'KOrganizer',
        'Outlook (Windows desktop)',
        'Outlook (macOS)',
        'Outlook.com',
        'Microsoft 365',
        'Google Calendar',
        'iCloud Calendar',
        'Nextcloud Calendar',
        'Fastmail Calendar',
        'Zoho Calendar',
        'Proton Calendar',
        'Yahoo Calendar',
        'Windows Calendar app',
        'BusyCal',
        'Emacs Org Mode',
        'generic CalDAV/WebDAV clients',
      ],
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcryptjs.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
