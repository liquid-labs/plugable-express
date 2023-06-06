const getLiqHome = () => process.env.LIQ_HOME || process.env.HOME + '/.liq'

export { getLiqHome }
