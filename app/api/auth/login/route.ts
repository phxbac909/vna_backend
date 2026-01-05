// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername, loginUser } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username và password là bắt buộc',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    const user = findUserByUsername(username);

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

    // Password sai
    if (user.password !== password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password sai',
          code: 'INVALID_PASSWORD'
        },
        { status: 401 }
      );
    }
  // Set expiresAt cho user (30 giây từ bây giờ)
    loginUser(username);
      
    // Lấy lại user để có expiresAt mới
    const updatedUser = findUserByUsername(username);
    
    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Lỗi khi tạo session',
          code: 'SESSION_ERROR'
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        success: true,
        message: 'Đăng nhập thành công',
        code: 'SUCCESS',
        data: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}