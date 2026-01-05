// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          message: 'Username là bắt buộc',
          code: 'MISSING_USERNAME'
        },
        { status: 400 }
      );
    }

    // Clear session token và expiresAt
    const result = logoutUser(username);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: 'User không tồn tại',
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    console.log(`👋 [LOGOUT API] User ${username} logged out successfully`);

    return NextResponse.json(
      {
        success: true,
        message: 'Đăng xuất thành công',
        code: 'SUCCESS'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Logout error:', error);
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-username',
    },
  });
}