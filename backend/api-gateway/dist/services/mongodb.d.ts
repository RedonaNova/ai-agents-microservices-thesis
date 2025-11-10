import mongoose from 'mongoose';
declare class MongoDBService {
    private isConnected;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnection(): mongoose.Connection;
}
declare const _default: MongoDBService;
export default _default;
//# sourceMappingURL=mongodb.d.ts.map