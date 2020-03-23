import { Batch } from './Batch'
import { Model } from './Model'
import { DocumentType, Documentable } from './Documentable'
import { Collection } from './Collection'
import { SubCollectionSymbol } from './SubCollection'
import { firestore, DocumentReference, DocumentSnapshot, Timestamp, CollectionReference, SnapshotOptions, Transaction } from './index'
import "reflect-metadata"

export class Doc extends Model implements DocumentType {

	public id: string

	public documentReference: DocumentReference

	public snapshot?: DocumentSnapshot

	public createdAt: Timestamp = Timestamp.now()

	public updatedAt: Timestamp = Timestamp.now()

	public static self<T extends Doc>(): Documentable<T> {
		const type: Documentable<T> = this
		return type
	}

	public static modelName(): string {
		return this.toString().split('(' || /s+/)[0].split(' ' || /s+/)[1].toLowerCase()
	}

	public static path(): string {
		return this.collectionReference().path
	}

	public static collectionReference() {
		return firestore.collection(this.modelName())
	}

	public modelName(): string {
		return (this.constructor as any).modelName()
	}

	public path: string

	public parent: CollectionReference

	public subCollection(path: string): CollectionReference {
		return this.documentReference.collection(path)
	}

	public static init<T extends Doc | Model>(reference?: string | DocumentReference): T {
		const model = new this(reference) as T
		return model
	}

	public static fromData<T extends Doc>(data: { [feild: string]: any }, reference?: string | DocumentReference): T {
		const model = new this(reference) as T
		model._set(data)
		return model
	}

	public static fromSnapshot<T extends Doc>(snapshot: DocumentSnapshot): T {
		const model = new this(snapshot.ref) as T
		model.snapshot = snapshot
		const option: SnapshotOptions = {
			serverTimestamps: "estimate"
		}
		const data = snapshot.data(option)
		if (data) {
			model._set(data)
		}
		return model
	}

	protected _set(data: { [feild: string]: any }) {
		super._set(data)
		this.createdAt = data["createdAt"] || Timestamp.now()
		this.updatedAt = data["updatedAt"] || Timestamp.now()
	}

	private _subCollections: { [key: string]: any } = {}

	private _defineCollection(key: string, value?: any) {
		const descriptor: PropertyDescriptor = {
			enumerable: true,
			configurable: true,
			get: () => {
				return this._subCollections[key]
			},
			set: (newValue) => {
				if (newValue instanceof Collection) {
					newValue.setCollectionReference(this.documentReference.collection(key))
					this._subCollections[key] = newValue
				}
			}
		}
		Object.defineProperty(this, key, descriptor)
	}

	/**
	 * constructor
	 */
	public constructor(reference?: string | DocumentReference) {
		super()
		let ref: DocumentReference | undefined = undefined
		if (reference instanceof Object) {
			ref = reference
		} else if (typeof reference === "string") {
			ref = (this.constructor as any).collectionReference().doc(`${reference}`)
		}
		if (ref) {
			this.documentReference = ref
			this.parent = this.documentReference.parent
			this.path = ref.path
			this.id = ref.id
		} else {
			this.documentReference = (this.constructor as any).collectionReference().doc()
			this.parent = this.documentReference.parent
			this.path = this.documentReference.path
			this.id = this.documentReference.id
		}
		for (const collection of this.subCollections()) {
			this._defineCollection(collection)
		}
	}

	public setData(data: { [feild: string]: any }) {
		this._set(data)
		return this
	}

	public setDataMerge(data: { [field: string]: any }) {
		this._setMerge(data)
		return this
	}

	public async fetch(transaction?: Transaction) {
		try {
			let snapshot: DocumentSnapshot
			if (transaction) {
				snapshot = await transaction.get(this.documentReference)
			} else {
				snapshot = await this.documentReference.get()
			}
			this.snapshot = snapshot
			const option: SnapshotOptions = {
				serverTimestamps: "estimate"
			}
			const data = snapshot.data(option)
			if (data) {
				this._set(data)
			}
			return this
		} catch (error) {
			throw error
		}
	}

	public async save() {
		const batch = new Batch()
		batch.save(this)
		await batch.commit()
	}

	public async update() {
		const batch = new Batch()
		batch.update(this)
		await batch.commit()
	}

	public async delete() {
		const batch = new Batch()
		batch.delete(this)
		await batch.commit()
	}

	public static async get<T extends Doc>(reference: string | DocumentReference) {
		let ref: DocumentReference
		if (reference instanceof DocumentReference) {
			ref = reference
		} else {
			ref = this.collectionReference().doc(`${reference}`)
		}
		try {
			const snapshot: DocumentSnapshot = await ref.get()
			if (snapshot.exists) {
				const model = new this(snapshot.ref) as T
				model.snapshot = snapshot
				const data = snapshot.data()
				if (data) {
					model._set(data)
				}
				return model
			} else {
				return undefined
			}
		} catch (error) {
			throw error
		}
	}

	public subCollections(): string[] {
		return Reflect.getMetadata(SubCollectionSymbol, this) || []
	}
}

