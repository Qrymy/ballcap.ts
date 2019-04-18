import * as firebase from 'firebase'
import { firestore } from './index'
import { Documentable } from './Document'

export class Batch {

	private _writeBatch: firebase.firestore.WriteBatch

	public constructor() {
		this._writeBatch = firestore.batch()
	}

	public save<T extends Documentable>(document: T, reference?: firebase.firestore.DocumentReference) {
		const data = document.data()
		if (data) {
			const documentReference = reference || document.documentReference
			data["createdAt"] = firebase.firestore.FieldValue.serverTimestamp()
			data["updatedAt"] = firebase.firestore.FieldValue.serverTimestamp()
			this._writeBatch.set(documentReference, data)
		}
	}

	public update<T extends Documentable>(document: T, reference?: firebase.firestore.DocumentReference) {
		const data = document.data()
		if (data) {
			const documentReference = reference || document.documentReference
			data["updatedAt"] = firebase.firestore.FieldValue.serverTimestamp()
			this._writeBatch.update(documentReference, data)
		}
	}

	public delete<T extends Documentable>(document: T, reference?: firebase.firestore.DocumentReference) {
		const documentReference = reference || document.documentReference
		this._writeBatch.delete(documentReference)
	}

	public async commit() {
		return await this._writeBatch.commit()
	}
}