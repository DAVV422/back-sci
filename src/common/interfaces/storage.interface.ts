export interface IStorageService {
  /**
   * Guarda un archivo en el almacenamiento configurado.
   * @param file Archivo subido mediante Multer.
   * @param subfolder Subdirectorio lógico opcional (ej: 'profiles').
   * @returns En 'profiles', la URL pública ('/api/user/image/profile_xxx.png'); en otras
   *   carpetas, solo el nombre del archivo, que sirve un endpoint propio con sesión.
   */
  saveFile(file: Express.Multer.File, subfolder?: string): Promise<string>;

  /**
   * Elimina un archivo del medio de almacenamiento.
   * @param fileUrl URL, ruta o nombre del archivo a eliminar.
   * @param subfolder Subdirectorio lógico (por defecto 'profiles').
   */
  deleteFile(fileUrl: string, subfolder?: string): Promise<void>;

  /**
   * Obtiene la ruta física del archivo en disco local para ser servido.
   * @param filename Nombre del archivo.
   * @param subfolder Subdirectorio lógico.
   */
  getFilePath(filename: string, subfolder?: string): string;
}
