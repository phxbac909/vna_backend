import { NextRequest, NextResponse } from 'next/server';
import { findUserById, updateUserPassword } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    // Validation
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Thiếu thông tin bắt buộc',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
          code: 'PASSWORD_TOO_SHORT'
        },
        { status: 400 }
      );
    }

    // Lấy user từ database (cần password để verify)
    const db = await import('@/lib/database');
    const users = db.getAllUsers();
    const user = users.find(u => u.id === userId);
    
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

    // Kiểm tra mật khẩu hiện tại
    if (user.password !== currentPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mật khẩu hiện tại không đúng',
          code: 'INVALID_CURRENT_PASSWORD'
        },
        { status: 401 }
      );
    }

    // Cập nhật mật khẩu mới
    const isUpdated = updateUserPassword(userId, newPassword);
    
    if (isUpdated) {
      return NextResponse.json(
        {
          success: true,
          message: 'Đổi mật khẩu thành công',
          code: 'SUCCESS'
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Không thể đổi mật khẩu',
          code: 'UPDATE_FAILED'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Change password error:', error);
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