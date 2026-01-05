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
  now.setSeconds(now.getSeconds() + 30);
  return now.toISOString();
};

// Generate UUID cho session
export const generateSessionToken = (): string => {
  return randomUUID();
};

// Set session token khi login (GHI ĐÈ token cũ)
export const setUserSessionToken = (username: string, token: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) return false;
  
  db.users[userIndex].sessionToken = token;
  db.users[userIndex].expiresAt = getNewExpirationTime();
  writeDatabase(db);
  
  console.log(`🔑 [DB] Set session token for ${username}: ${token.substring(0, 8)}...`);
  return true;
};

// Verify session token
export const verifySessionToken = (username: string, token: string): boolean => {
  const db = readDatabase();
  const user = db.users.find(user => user.username === username);
  
  if (!user || !user.sessionToken) {
    console.log(`❌ [DB] No session token found for ${username}`);
    return false;
  }
  
  const isValid = user.sessionToken === token;
  console.log(`🔍 [DB] Token verification for ${username}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  
  return isValid;
};

// Clear session token khi logout
export const clearUserSessionToken = (username: string): boolean => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) return false;
  
  delete db.users[userIndex].sessionToken;
  delete db.users[userIndex].expiresAt;
  writeDatabase(db);
  
  console.log(`🗑️ [DB] Cleared session token for ${username}`);
  return true;
};

// Login: Tạo session token mới (ghi đè token cũ nếu có)
export const loginUser = (username: string): { success: boolean; sessionToken?: string } => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return { success: false };
  }
  
  const sessionToken = generateSessionToken();
  db.users[userIndex].sessionToken = sessionToken;
  db.users[userIndex].expiresAt = getNewExpirationTime();
  writeDatabase(db);
  
  console.log(`✅ [DB] User ${username} logged in, token: ${sessionToken.substring(0, 8)}...`);
  
  return { success: true, sessionToken };
};

// Logout: Clear token
export const logoutUser = (username: string): boolean => {
  return clearUserSessionToken(username);
};

// Kiểm tra và refresh session (bao gồm cả token validation)
export const checkAndRefreshSession = (
  username: string, 
  token: string
): { valid: boolean; expiresAt?: string; reason?: string } => {
  const db = readDatabase();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return { valid: false, reason: 'USER_NOT_FOUND' };
  }
  
  const user = db.users[userIndex];
  
  // Check 1: Có session token không?
  if (!user.sessionToken) {
    return { valid: false, reason: 'NO_SESSION' };
  }
  
  // Check 2: Token có khớp không?
  if (user.sessionToken !== token) {
    console.log(`❌ [DB] Token mismatch for ${username}!`);
    console.log(`   Expected: ${user.sessionToken?.substring(0, 8)}...`);
    console.log(`   Received: ${token.substring(0, 8)}...`);
    return { valid: false, reason: 'TOKEN_MISMATCH' };
  }
  
  // Check 3: Có expiresAt không?
  if (!user.expiresAt) {
    return { valid: false, reason: 'NO_EXPIRATION' };
  }
  
  const now = new Date();
  const expiresAt = new Date(user.expiresAt);
  
  // Check 4: Session đã hết hạn chưa?
  if (expiresAt <= now) {
    console.log(`⏰ [DB] Session expired for ${username}`);
    delete db.users[userIndex].sessionToken;
    delete db.users[userIndex].expiresAt;
    writeDatabase(db);
    return { valid: false, reason: 'SESSION_EXPIRED' };
  }
  
  // Session hợp lệ => REFRESH về 30s nữa
  db.users[userIndex].expiresAt = getNewExpirationTime();
  writeDatabase(db);
  
  console.log(`✅ [DB] Session refreshed for ${username}, new expiry: ${db.users[userIndex].expiresAt}`);
  
  return { 
    valid: true, 
    expiresAt: db.users[userIndex].expiresAt 
  };
};

// Chỉ kiểm tra session (không refresh)
export const checkSessionOnly = (username: string, token: string): boolean => {
  const db = readDatabase();
  const user = db.users.find(user => user.username === username);
  
  if (!user || !user.expiresAt || !user.sessionToken) return false;
  if (user.sessionToken !== token) return false;
  
  const now = new Date();
  const expiresAt = new Date(user.expiresAt);
  
  return expiresAt > now;
};