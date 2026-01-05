import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, findUserById } from '@/lib/database';

// Giả lập JWT token (trong thực tế dùng thư viện như jsonwebtoken)
const generateToken = (userId: string, username: string): string => {
  const payload = {
    userId,
    username,
    exp: Date.now() + 30 * 1000, // 30 giây
    iat: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const generateRefreshToken = (userId: string): string => {
  const payload = {
    userId,
    type: 'refresh',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 ngày
    iat: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const verifyToken = (token: string): any => {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Token expired
    }
    
    return payload;
  } catch (error) {
    return null;
  }
};

// API để refresh token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu refresh token',
          code: 'MISSING_REFRESH_TOKEN'
        },
        { status: 400 }
      );
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        {
          success: false,
          message: 'Refresh token không hợp lệ',
          code: 'INVALID_REFRESH_TOKEN'
        },
        { status: 401 }
      );
    }

    // Tìm user
    const user = findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User không tồn tại',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Tạo token mới
    const newToken = generateToken(user.id, user.username);
    const newRefreshToken = generateRefreshToken(user.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Refresh token thành công',
        code: 'SUCCESS',
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt
          }
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

// API để verify token
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu token',
          code: 'MISSING_TOKEN'
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: 'Token không hợp lệ hoặc đã hết hạn',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Token hợp lệ',
        code: 'SUCCESS',
        data: payload
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Verify token error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Lỗi server',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}