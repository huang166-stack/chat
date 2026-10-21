import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名').max(64, '用户名过长'),
  password: z.string().min(1, '请输入密码').max(64, '密码过长'),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(4, '用户名至少 4 位')
      .max(32, '用户名最多 32 位')
      .regex(/^[a-zA-Z0-9_]+$/, '仅支持字母、数字和下划线'),
    password: z
      .string()
      .min(8, '密码至少 8 位')
      .max(64, '密码最多 64 位')
      .regex(/[A-Za-z]/, '密码必须包含字母')
      .regex(/\d/, '密码必须包含数字'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: '两次密码不一致',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
