'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  getModels,
  renameConversation,
} from '@/lib/api/chat';

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: getModels,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => getMessages(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ modelConfigId, title }: { modelConfigId: string | number; title?: string }) =>
      createConversation(modelConfigId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string | number; title: string }) => renameConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
