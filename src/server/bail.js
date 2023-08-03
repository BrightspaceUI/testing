const bail = new Set();
const bailOn = key => bail.delete(key);

export {
	bail,
	bailOn
};
