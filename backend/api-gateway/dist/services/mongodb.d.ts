declare class MongoDBService {
    private isConnected;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getConnection(): any;
}
declare const _default: MongoDBService;
export default _default;
//# sourceMappingURL=mongodb.d.ts.map