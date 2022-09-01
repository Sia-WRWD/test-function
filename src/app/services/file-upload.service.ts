import { Injectable } from '@angular/core';
import { AngularFireDatabase, AngularFireList } from '@angular/fire/compat/database';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { FileUpload } from '../models/file-upload.model';
import { ProfileImg } from '../models/profile-img.model';

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  private rdbPath = '/';
  private dbPath = '/profile_img';
  imageRef!: AngularFirestoreCollection<ProfileImg>;

  constructor(private rdb: AngularFireDatabase, private db: AngularFirestore, private storage: AngularFireStorage) { 
    this.imageRef = db.collection(this.dbPath);
  }
  
  pushFileToStorage(fileUpload: FileUpload): Observable<number | undefined> {
    const filePath = `${this.rdbPath}/${fileUpload.file.name}`;
    const storageRef = this.storage.ref(filePath);
    const uploadTask = this.storage.upload(filePath, fileUpload.file);
    uploadTask.snapshotChanges().pipe(
      finalize(() => {
        storageRef.getDownloadURL().subscribe(downloadURL => {
          fileUpload.url = downloadURL;
          fileUpload.name = fileUpload.file.name;
          this.saveFileData(fileUpload);
        });
      })
    ).subscribe();
    return uploadTask.percentageChanges();
  }

  private saveFileData(fileUpload: FileUpload): void {
    this.rdb.list(this.rdbPath).push(fileUpload);
    
    var details = {
      image_url: fileUpload.url,
      name: fileUpload.name
    }

    this.imageRef.add({...details});
  }

  getFiles(numberItems: number): AngularFireList<FileUpload> {
    return this.rdb.list(this.rdbPath, ref =>
      ref.limitToLast(numberItems));
  }

  deleteFile(fileUpload: FileUpload): void {
    this.deleteFileDatabase(fileUpload.key)
      .then(() => {
        this.deleteFileStorage(fileUpload.name);
      })
      .catch(error => console.log(error));
  }
  
  private deleteFileDatabase(key: string): Promise<void> {
    return this.rdb.list(this.rdbPath).remove(key);
  }
  
  private deleteFileStorage(name: string): void {
    const storageRef = this.storage.ref(this.rdbPath);
    storageRef.child(name).delete();
  }
}
