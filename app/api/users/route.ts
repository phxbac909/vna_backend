// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const users = getAllUsers();
    
    // Loại bỏ password trước khi trả về
    const safeUsers = users.map(({ password, ...user }) => user);

    return NextResponse.json(
      {
        success: true,
        message: 'Lấy danh sách users thành công',
        code: 'SUCCESS',
        data: safeUsers
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Get users error:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}