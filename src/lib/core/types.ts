const baseServices = {
    loggerService: Symbol('loggerService'),
    mongoService: Symbol('mongoService'),
    redisService: Symbol('redisService'),
    minioService: Symbol('minioService'),
};

const cacheServices = {
    candleCacheService: Symbol('candleCacheService'),
    signalCacheService: Symbol('signalCacheService'),
    scheduleCacheService: Symbol('scheduleCacheService'),
    strategyCacheService: Symbol('strategyCacheService'),
    riskCacheService: Symbol('riskCacheService'),
    partialCacheService: Symbol('partialCacheService'),
    breakevenCacheService: Symbol('breakevenCacheService'),
    storageCacheService: Symbol('storageCacheService'),
    notificationCacheService: Symbol('notificationCacheService'),
    logCacheService: Symbol('logCacheService'),
    measureCacheService: Symbol('measureCacheService'),
    intervalCacheService: Symbol('intervalCacheService'),
    memoryCacheService: Symbol('memoryCacheService'),
    recentCacheService: Symbol('recentCacheService'),
    stateCacheService: Symbol('stateCacheService'),
    sessionCacheService: Symbol('sessionCacheService'),
}

const dbServices = {
    candleDbService: Symbol('candleDbService'),
    signalDbService: Symbol('signalDbService'),
    scheduleDbService: Symbol('scheduleDbService'),
    strategyDbService: Symbol('strategyDbService'),
    riskDbService: Symbol('riskDbService'),
    partialDbService: Symbol('partialDbService'),
    breakevenDbService: Symbol('breakevenDbService'),
    storageDbService: Symbol('storageDbService'),
    notificationDbService: Symbol('notificationDbService'),
    logDbService: Symbol('logDbService'),
    measureDbService: Symbol('measureDbService'),
    intervalDbService: Symbol('intervalDbService'),
    memoryDbService: Symbol('memoryDbService'),
    recentDbService: Symbol('recentDbService'),
    stateDbService: Symbol('stateDbService'),
    sessionDbService: Symbol('sessionDbService'),
}

const dataServices = {
    candleDataService: Symbol('candleDataService'),
    signalDataService: Symbol('signalDataService'),
    scheduleDataService: Symbol('scheduleDataService'),
    strategyDataService: Symbol('strategyDataService'),
    riskDataService: Symbol('riskDataService'),
    partialDataService: Symbol('partialDataService'),
    breakevenDataService: Symbol('breakevenDataService'),
    storageDataService: Symbol('storageDataService'),
    notificationDataService: Symbol('notificationDataService'),
    logDataService: Symbol('logDataService'),
    measureDataService: Symbol('measureDataService'),
    intervalDataService: Symbol('intervalDataService'),
    memoryDataService: Symbol('memoryDataService'),
    recentDataService: Symbol('recentDataService'),
    stateDataService: Symbol('stateDataService'),
    sessionDataService: Symbol('sessionDataService'),
}

const connectionServices = {
    logConnectionService: Symbol('logConnectionService'),
    notificationConnectionService: Symbol('notificationConnectionService'),
    storageConnectionService: Symbol('storageConnectionService'),
}

export const TYPES = {
    ...baseServices,
    ...cacheServices,
    ...dbServices,
    ...dataServices,
    ...connectionServices,
}

export default TYPES;
