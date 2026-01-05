import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';


export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: string;
  expiresAt?: string; 
  sessionToken?: string; // UUID cho session hiện tại
}

interface Database {
  users: User[];
}

const dbPath = path.join(process.cwd(), 'data', 'users.json');

const ensureDataFolder = (): void => {
  const dataFolder = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
  }
};

export const readDatabase = (): Database => {
  try {
    ensureDataFolder();
    if (!fs.existsSync(dbPath)) {
      const initialData: Database = { users: [] };
      fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { users: [] };
  }
};

export const writeDatabase = (data: Database): void => {
  try {
    ensureDataFolder();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
  }
};

export const findUserByUsername = (username: string): User | undefined => {
  const db = readDatabase();
  return db.users.find(user => user.username === username);
};

export const addUser = (
  username: string, 
  password: string, 
  role: 'admin' | 'user' = 'user'
): User => {
  const db = readDatabase();
  const newUser: User = {
    id: Date.now().toString(),
    username,
    password,
    role,
    createdAt: new Date().toISOString(),
  };
  db.users.push(newUser);
  writeDatabase(db);
  return newUser;
};

export const findUserById = (id: string): User | undefined => {
  const db = readDatabase();
  return db.users.find(user => user.id === id);
};


export const getAllUsers = (): User[] => {
  const db = readDatabase();
  return db.users;
};

export const deleteUser = (id: string): boolean => {
  const db = readDatabase();
  const initialLength = db.users.length;
  db.users = db.users.filter(user => user.id !== id);
  
  if (db.users.length < initialLength) {
    writeDatabase(db);
    return true;
  }
  return false;
};

export const updateUserPassword = (id: string, newPassword: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.id === id);
  
  if (userIndex !== -1) {
    db.users[userIndex].password = newPassword;
    writeDatabase(db);
    return true;
  }
  return false;
};

// Thêm 30 giây vào thời gian hiện tại
const getNewExpirationTime = (): string => {
  const now = new Date();
  now.setSeconds(now.getSeconds() + 30); // Thêm 30 giây
  return now.toISOString();
};

// Cập nhật thời gian hết hạn
export const updateUserExpiration = (username: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) return false;
  
  db.users[userIndex].expiresAt = getNewExpirationTime();
  writeDatabase(db);
  return true;
};

// Kiểm tra user có còn hiệu lực không
export const isUserSessionValid = (username: string): boolean => {
  const db = readDatabase();
  const user = db.users.find(user => user.username === username);
  
  if (!user || !user.expiresAt) return false;
  
  const now = new Date();
  const expiresAt = new Date(user.expiresAt);
  
  return expiresAt > now;
};

// Set expiresAt khi login
export const setUserSession = (username: string): boolean => {
  return updateUserExpiration(username);
};

// Clear expiresAt khi logout
export const clearUserSession = (username: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) return false;
  
  delete db.users[userIndex].expiresAt;
  writeDatabase(db);
  return true;
};

// Lấy thời gian hết hạn
export const getUserExpiresAt = (username: string): string | null => {
  const db = readDatabase();
  const user = db.users.find(user => user.username === username);
  
  return user?.expiresAt || null;
};

export const loginUser = (username: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) return false;
  
  db.users[userIndex].expiresAt = getNewExpirationTime();
  writeDatabase(db);
  return true;
};

// Logout: Clear expiresAt
export const logoutUser = (username: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) return false;
  
  delete db.users[userIndex].expiresAt;
  writeDatabase(db);
  return true;
};

// Kiểm tra và refresh session nếu còn hiệu lực
export const checkAndRefreshSession = (username: string): { valid: boolean; expiresAt?: string } => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return { valid: false };
  }
  
  const user = db.users[userIndex];
  
  // Nếu không có expiresAt => chưa login
  if (!user.expiresAt) {
    return { valid: false };
  }
  
  const now = new Date();
  const expiresAt = new Date(user.expiresAt);
  
  // Session đã hết hạn
  if (expiresAt <= now) {
    delete db.users[userIndex].expiresAt; // Xóa expiresAt
    writeDatabase(db);
    return { valid: false };
  }
  
  // Session còn hiệu lực => RESET về 30s nữa
  db.users[userIndex].expiresAt = getNewExpirationTime();
  writeDatabase(db);
  
  return { 
    valid: true, 
    expiresAt: db.users[userIndex].expiresAt 
  };
};

// Chỉ kiểm tra session (không refresh)
export const checkSessionOnly = (username: string): boolean => {
  const db = readDatabase();
  const user = db.users.find(user => user.username === username);
  
  if (!user || !user.expiresAt) return false;
  
  const now = new Date();
  const expiresAt = new Date(user.expiresAt);
  
  return expiresAt > now;
};
