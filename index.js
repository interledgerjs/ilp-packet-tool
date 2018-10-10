#!/usr/bin/env node

const IlpPacket = require('ilp-packet')
const BtpPacket = require('btp-packet')
const { argv } = require('yargs')

// Here's our packet to parse
const packet = argv._[0]
const encoding = (argv.encoding || (argv.hex ? 'hex' : 'base64'))

if (!packet) {
  console.error('no packet provided.')
  process.exit(1)
}

function parseBtp (packet) {
  console.error('attempting to parse as btp. encoding=' + encoding)
  const parsedBtp = BtpPacket.deserialize(Buffer.from(packet, encoding))

  for (const protocol of parsedBtp.data.protocolData) {
    try {
      if (protocol.protocolName === 'ilp') {
        protocol.contentType = 'application/octet-stream'
        protocol.data = parseIlp(protocol.data)
        continue
      }
    } catch (e) {
      // TODO
    }

    switch (protocol.contentType) {
      case BtpPacket.MIME_APPLICATION_OCTET_STREAM:
        protocol.contentType = 'application/octet-stream'
        protocol.data = protocol.data.toString('hex')
        break

      case BtpPacket.MIME_TEXT_PLAIN_UTF8:
        protocol.contentType = 'text/plain-utf8'
        protocol.data = protocol.data.toString()
        break

      case BtpPacket.MIME_APPLICATION_JSON:
        protocol.contentType = 'application/json'
        try {
          protocol.data = JSON.parse(protocol.data.toString())
        } catch (e) {
          // TODO
          protocol.data = protocol.data.toString()
        }
        break
    }
  }

  return parsedBtp
}

function parseIlp (packet) {
  console.error('attempting to parse as ilp. encoding=' + encoding)
  const parsedIlp = IlpPacket
    .deserializeIlpPacket(Buffer.from(packet, encoding))

  for (const field of Object.keys(parsedIlp.data)) {
    if (Buffer.isBuffer(parsedIlp.data[field])) {
      parsedIlp.data[field] = parsedIlp.data[field].toString('hex')
    }
  }  

  return parsedIlp
}

function pretty (obj) {
  console.log(JSON.stringify(obj, null, 2))
}

if (argv.btp) {
  pretty(parseBtp(packet))
} else if (argv.ilp) {
  pretty(parseIlp(packet))
} else {
  try {
    pretty(parseIlp(packet))
  } catch (e) {
    console.error('packet is not ilp.')
    try {
      pretty(parseBtp(packet))
    } catch (e) {
      console.error('packet is neither btp nor ilp.')
    }
  }
}
