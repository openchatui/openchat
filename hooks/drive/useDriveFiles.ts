"use client"

import { useApiMutation } from '@/hooks/useApiMutation'
import {
  createFolder,
  moveFolder,
  moveFile,
  moveFolderToTrash,
  moveFileToTrash,
  restoreFolder,
  restoreFile,
  renameFolder,
  renameFile,
  setFolderStarred,
  setFileStarred,
  moveItemsBulk,
} from '@/lib/api/drive'

export function useCreateFolder() {
  return useApiMutation(createFolder)
}

export function useMoveFolder() {
  return useApiMutation(moveFolder)
}

export function useMoveFile() {
  return useApiMutation(moveFile)
}

export function useMoveFolderToTrash() {
  return useApiMutation(moveFolderToTrash)
}

export function useMoveFileToTrash() {
  return useApiMutation(moveFileToTrash)
}

export function useRestoreFolder() {
  return useApiMutation(restoreFolder)
}

export function useRestoreFile() {
  return useApiMutation(restoreFile)
}

export function useRenameFolder() {
  return useApiMutation(renameFolder)
}

export function useRenameFile() {
  return useApiMutation(renameFile)
}

export function useSetFolderStarred() {
  return useApiMutation(setFolderStarred)
}

export function useSetFileStarred() {
  return useApiMutation(setFileStarred)
}

export function useMoveItemsBulk() {
  return useApiMutation(moveItemsBulk)
}


