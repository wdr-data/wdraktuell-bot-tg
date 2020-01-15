export function partition(str, separator) {
    str = str.split(separator);

    if (str.length > 1) {
        const ret = str.splice(0, 1);
        ret.push(str.join(separator));

        return ret;
    }

    return str;
}
