export interface IStorageService {
  /**
   * Guarda un archivo en el almacenamiento configurado.
   * @param file Archivo subido mediante Multer.
   * @param subfolder Subdirectorio lógico opcional (ej: 'profiles').
   * @returns URL de acceso al archivo guardado (ej: '/api/user/image/profile_xxx.png').
   */
  saveFile(file: Express.Multer.File, subfolder?: string): Promise<string>;

  /**
   * Elimina un archivo del medio de almacenamiento.
   * @param fileUrl URL o ruta del archivo a eliminar.
   */
  deleteFile(fileUrl: string): Promise<void>;

  /**
   * Obtiene la ruta física del archivo en disco local para ser servido.
   * @param filename Nombre del archivo.
   * @param subfolder Subdirectorio lógico.
   */
  getFilePath(filename: string, subfolder?: string): string;
}
