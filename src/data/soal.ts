import type { Soal } from '../lib/types'

/**
 * Bank soal default (seed) — 30 kasus keuangan UMKM sehari-hari.
 *
 * Data ini hanya dipakai sebagai isi awal database. Setelah tersimpan di Supabase,
 * fasilitator dapat mengubah seluruh soal lewat menu Bank Soal tanpa menyentuh kode.
 *
 * Dua pesan utama yang ditanamkan lewat insight:
 *   1. Pisahkan transaksi pribadi dan usaha
 *   2. Catat setiap transaksi usaha secara konsisten
 */
export const SOAL_DEFAULT: Omit<Soal, 'id' | 'tema_id'>[] = [
  {
    teks: 'Warung nasi Bu Sari hari ini laris. Total uang tunai yang diterima dari pembeli Rp2.500.000. Apa yang seharusnya dilakukan Bu Sari?',
    opsi: [
      'Catat Rp2.500.000 sebagai pemasukan usaha hari ini',
      'Tidak perlu dicatat, karena uangnya langsung dipakai belanja besok',
      'Catat nanti saja di akhir bulan kalau sempat',
    ],
    jawaban: 'A',
    nominal: 2_500_000,
    efek: 'masuk',
    insight:
      'Penjualan tunai harus dicatat pada hari terjadinya, bukan ditunda. Kalau ditunda sampai akhir bulan, hampir pasti ada transaksi yang lupa — dan omzet usaha jadi tidak pernah ketahuan angka aslinya.',
  },
  {
    teks: 'Pak Andi membeli bahan baku (tepung, gula, telur) secara tunai seharga Rp1.200.000 untuk produksi minggu ini. Bagaimana pencatatannya?',
    opsi: [
      'Tidak dicatat, karena bahan baku akan jadi barang dagangan',
      'Catat Rp1.200.000 sebagai pengeluaran usaha (pembelian bahan baku)',
      'Catat setengahnya saja, sisanya dianggap stok',
    ],
    jawaban: 'B',
    nominal: 1_200_000,
    efek: 'keluar',
    insight:
      'Setiap uang usaha yang keluar harus dicatat, apa pun bentuk barangnya. Tanpa catatan pembelian bahan baku, Anda tidak akan pernah tahu berapa modal sebenarnya yang tertanam di setiap produk.',
  },
  {
    teks: 'Pelanggan langganan mengambil 50 kotak kue senilai Rp1.500.000, dan berjanji membayar minggu depan. Bagaimana pencatatan hari ini?',
    opsi: [
      'Catat sebagai pemasukan Rp1.500.000, karena barang sudah diserahkan',
      'Tidak dicatat sama sekali sampai uangnya diterima',
      'Catat sebagai PIUTANG Rp1.500.000 — kas usaha belum bertambah',
    ],
    jawaban: 'C',
    nominal: 0,
    efek: 'netral',
    insight:
      'Ini jebakan paling sering: barang sudah keluar tapi uang belum masuk. Kalau dicatat sebagai pemasukan kas, laporan akan terlihat "untung" padahal dompet kosong. Catat sebagai piutang, dan pindahkan jadi pemasukan saat uangnya benar-benar diterima.',
  },
  {
    teks: 'Pak Budi mengambil Rp500.000 dari laci warung untuk membayar SPP anaknya. Apa langkah yang benar?',
    opsi: [
      'Catat sebagai pengambilan pribadi (prive) — saldo usaha berkurang Rp500.000',
      'Tidak usah dicatat, kan uangnya memang milik Pak Budi sendiri',
      'Catat sebagai biaya pendidikan usaha',
    ],
    jawaban: 'A',
    nominal: 500_000,
    efek: 'keluar',
    insight:
      'Uang di laci warung adalah uang USAHA, bukan uang pribadi — meskipun pemiliknya Anda sendiri. Setiap pengambilan pribadi wajib dicatat sebagai prive, supaya terlihat jelas berapa banyak uang usaha yang "bocor" ke kebutuhan rumah tangga.',
  },
  {
    teks: 'Tagihan listrik kios bulan ini Rp350.000 dan sudah dibayar tunai. Bagaimana perlakuannya?',
    opsi: [
      'Digabung saja dengan listrik rumah, biar praktis',
      'Tidak perlu dicatat karena bukan pembelian barang',
      'Catat Rp350.000 sebagai biaya operasional usaha',
    ],
    jawaban: 'C',
    nominal: 350_000,
    efek: 'keluar',
    insight:
      'Listrik, air, dan sewa adalah biaya operasional yang ikut memakan keuntungan. Kalau listrik kios digabung dengan listrik rumah, biaya usaha jadi terlihat lebih kecil dari kenyataan — dan harga jual Anda bisa salah hitung.',
  },
  {
    teks: 'Tetangga menitipkan 20 bungkus keripik untuk dijual di warung Bu Rina. Belum ada uang yang berpindah tangan. Apa yang dicatat Bu Rina hari ini?',
    opsi: [
      'Catat sebagai pembelian barang dagangan',
      'Catat sebagai barang titipan (konsinyasi) — belum ada perubahan kas',
      'Catat sebagai pemasukan senilai harga jual keripik',
    ],
    jawaban: 'B',
    nominal: 0,
    efek: 'netral',
    insight:
      'Barang titipan belum jadi milik Anda dan belum melibatkan uang. Yang dicatat nanti hanya KOMISI saat keripik terjual. Salah mencatat titipan sebagai pembelian akan menggelembungkan biaya usaha yang sebenarnya tidak ada.',
  },
  {
    teks: 'Gaji 2 orang karyawan bulan ini total Rp1.800.000 dibayar tunai. Apakah ini perlu dicatat?',
    opsi: [
      'Perlu — catat Rp1.800.000 sebagai biaya gaji usaha',
      'Tidak perlu, karena karyawan masih saudara sendiri',
      'Perlu, tapi hanya kalau ada slip gaji resmi',
    ],
    jawaban: 'A',
    nominal: 1_800_000,
    efek: 'keluar',
    insight:
      'Gaji tetap biaya usaha, walaupun yang dibayar adalah saudara atau anak sendiri. Kalau tidak dicatat, usaha terlihat lebih untung daripada aslinya — dan Anda akan kaget saat harus menggaji orang luar dengan tarif pasar.',
  },
  {
    teks: 'Selama sebulan, total pemasukan usaha Rp5.000.000 dan total pengeluaran Rp3.200.000. Berapa laba bersih bulan itu?',
    opsi: ['Rp8.200.000', 'Rp1.800.000', 'Rp3.200.000'],
    jawaban: 'B',
    nominal: 0,
    efek: 'netral',
    insight:
      'Laba = Pemasukan − Pengeluaran = Rp5.000.000 − Rp3.200.000 = Rp1.800.000. Rumusnya sederhana, tapi hanya bisa dipakai kalau pencatatannya lengkap. Tanpa catatan, angka laba cuma tebakan.',
  },

  {
    teks: 'Toko online Bu Dewi menerima pembayaran Rp1.750.000 yang masuk ke rekening usaha hari ini. Bagaimana pencatatannya?',
    opsi: [
      'Tidak dicatat karena uangnya masih di rekening, belum dipegang',
      'Catat hanya kalau nanti ditarik tunai',
      'Catat Rp1.750.000 sebagai pemasukan usaha',
    ],
    jawaban: 'C',
    nominal: 1_750_000,
    efek: 'masuk',
    insight:
      'Uang di rekening usaha sama nyatanya dengan uang tunai di laci. Justru punya rekening khusus usaha adalah cara termudah memisahkan uang pribadi dan usaha — mutasi banknya otomatis jadi catatan.',
  },
  {
    teks: 'Sewa kios dibayar Rp2.000.000 untuk satu bulan ke depan. Bagaimana perlakuannya?',
    opsi: [
      'Catat Rp2.000.000 sebagai biaya sewa (pengeluaran usaha)',
      'Tidak dicatat karena kios bukan milik sendiri',
      'Catat sebagai penambahan aset usaha',
    ],
    jawaban: 'A',
    nominal: 2_000_000,
    efek: 'keluar',
    insight:
      'Sewa adalah biaya tetap yang harus dibayar walaupun jualan sedang sepi. Mengetahui angka pastinya penting untuk menghitung berapa minimal omzet per hari supaya usaha tidak rugi.',
  },
  {
    teks: 'Pak Hasan mengambil bahan baku Rp900.000 dari supplier dengan perjanjian dibayar bulan depan. Apa yang dicatat hari ini?',
    opsi: [
      'Catat sebagai pengeluaran Rp900.000 karena barang sudah diterima',
      'Catat sebagai HUTANG Rp900.000 — kas usaha belum berkurang',
      'Tidak dicatat sampai pembayaran dilakukan',
    ],
    jawaban: 'B',
    nominal: 0,
    efek: 'netral',
    insight:
      'Hutang adalah kewajiban yang sudah lahir hari ini walaupun uangnya belum keluar. Banyak UMKM merasa "kas aman" lalu kaget saat jatuh tempo menumpuk. Catat hutang sejak awal supaya Anda tahu uang mana yang sebenarnya sudah "punya tuan".',
  },
  {
    teks: 'Bu Ratna menerima pesanan katering senilai Rp4.000.000. Pelanggan membayar uang muka (DP) 50% secara tunai hari ini. Berapa yang dicatat sebagai kas masuk?',
    opsi: ['Rp4.000.000', 'Rp1.000.000', 'Rp2.000.000'],
    jawaban: 'C',
    nominal: 2_000_000,
    efek: 'masuk',
    insight:
      'DP 50% dari Rp4.000.000 = Rp2.000.000. Yang dicatat sebagai kas masuk hanya uang yang benar-benar diterima. Sisa Rp2.000.000 dicatat terpisah sebagai piutang yang masih harus ditagih setelah acara.',
  },
  {
    teks: 'Pak Joko memakai uang kas usaha Rp1.500.000 untuk membeli sepeda motor keperluan keluarga. Bagaimana pencatatannya?',
    opsi: [
      'Catat sebagai prive (pengambilan pribadi) — saldo usaha berkurang Rp1.500.000',
      'Catat sebagai pembelian aset usaha',
      'Tidak perlu dicatat, motor kan bisa dipakai antar pesanan juga',
    ],
    jawaban: 'A',
    nominal: 1_500_000,
    efek: 'keluar',
    insight:
      'Kalau aset dibeli untuk keperluan keluarga, itu prive — bukan aset usaha. Mencatatnya sebagai aset usaha membuat modal terlihat besar padahal uangnya sudah tidak produktif untuk usaha.',
  },
  {
    teks: 'Bu Siti menukar 10 kg gula dagangannya dengan jasa servis kompor dari tetangga. Tidak ada uang berpindah. Bagaimana pencatatannya?',
    opsi: [
      'Tidak dicatat sama sekali karena tidak ada uang',
      'Catat sebagai pemasukan tunai senilai harga gula',
      'Catat sebagai barter — nilai barang keluar dan jasa masuk dicatat, kas tidak berubah',
    ],
    jawaban: 'C',
    nominal: 0,
    efek: 'netral',
    insight:
      'Barter tetap transaksi usaha walau tanpa uang. Stok gula Anda berkurang nyata. Kalau tidak dicatat, stok di catatan tidak akan pernah cocok dengan stok di gudang.',
  },
  {
    teks: 'Pembelian kemasan dan label produk senilai Rp450.000 dibayar tunai. Termasuk apa transaksi ini?',
    opsi: [
      'Bukan biaya usaha, hanya pelengkap',
      'Pengeluaran usaha Rp450.000 (biaya kemasan)',
      'Pemasukan usaha karena menambah nilai jual produk',
    ],
    jawaban: 'B',
    nominal: 450_000,
    efek: 'keluar',
    insight:
      'Kemasan sering dianggap "biaya kecil" lalu tidak dicatat. Padahal kalau diakumulasi sebulan, biaya kecil yang tidak tercatat inilah yang bikin laba di catatan tidak pernah cocok dengan uang di dompet.',
  },

  {
    teks: 'Ikut bazar UMKM selama akhir pekan, total penjualan tunai Rp3.200.000. Apa yang dilakukan?',
    opsi: [
      'Catat Rp3.200.000 sebagai pemasukan usaha',
      'Tidak dicatat, karena bazar hanya kegiatan sesekali',
      'Catat setelah dikurangi uang makan panitia',
    ],
    jawaban: 'A',
    nominal: 3_200_000,
    efek: 'masuk',
    insight:
      'Catat pemasukan secara UTUH lebih dulu, baru catat pengeluaran (sewa stan, uang makan) secara terpisah. Mencatat angka bersih saja membuat Anda kehilangan informasi berapa biaya sebenarnya untuk ikut bazar.',
  },
  {
    teks: 'Membayar cicilan pinjaman modal usaha ke koperasi sebesar Rp750.000 bulan ini. Bagaimana pencatatannya?',
    opsi: [
      'Tidak dicatat karena hanya mengembalikan uang pinjaman',
      'Catat Rp750.000 sebagai pengeluaran usaha (pembayaran cicilan)',
      'Catat sebagai pemasukan karena mengurangi hutang',
    ],
    jawaban: 'B',
    nominal: 750_000,
    efek: 'keluar',
    insight:
      'Cicilan mengurangi kas usaha secara nyata setiap bulan. Wajib dicatat agar Anda tahu berapa uang yang sudah "terikat" sebelum menghitung sisa yang benar-benar bebas dipakai untuk belanja stok.',
  },
  {
    teks: 'Bu Lina menyetorkan uang tabungan pribadinya Rp2.000.000 ke kas usaha untuk menambah modal. Bagaimana pencatatannya?',
    opsi: [
      'Catat sebagai penjualan usaha',
      'Tidak dicatat, kan uangnya milik sendiri',
      'Catat sebagai tambahan modal — kas usaha bertambah Rp2.000.000',
    ],
    jawaban: 'C',
    nominal: 2_000_000,
    efek: 'masuk',
    insight:
      'Setoran modal menambah kas tapi BUKAN pendapatan — usaha tidak menjual apa pun. Kalau dicatat sebagai penjualan, omzet terlihat naik palsu. Bedakan "uang masuk" dengan "uang hasil jualan".',
  },
  {
    teks: 'Seorang pembeli mengembalikan barang karena rusak, dan Bu Ani mengembalikan uang Rp300.000. Bagaimana pencatatannya?',
    opsi: [
      'Catat Rp300.000 sebagai retur penjualan — kas usaha berkurang',
      'Hapus saja catatan penjualan yang lama',
      'Tidak dicatat, anggap sebagai apes',
    ],
    jawaban: 'A',
    nominal: 300_000,
    efek: 'keluar',
    insight:
      'Jangan menghapus catatan lama — catat retur sebagai transaksi baru. Riwayat yang utuh membuat Anda bisa melihat pola: produk mana yang sering dikembalikan dan berapa kerugiannya per bulan.',
  },
  {
    teks: 'Pelanggan yang minggu lalu berhutang akhirnya melunasi Rp1.500.000 secara tunai hari ini. Apa yang dicatat?',
    opsi: [
      'Tidak dicatat, karena sudah dicatat waktu barang diserahkan',
      'Catat Rp1.500.000 sebagai kas masuk (pelunasan piutang)',
      'Catat sebagai penjualan baru Rp1.500.000',
    ],
    jawaban: 'B',
    nominal: 1_500_000,
    efek: 'masuk',
    insight:
      'Saat piutang dilunasi, yang bertambah adalah KAS dan yang berkurang adalah piutang — bukan penjualan baru. Kalau dicatat sebagai penjualan lagi, omzet Anda terhitung dobel dari transaksi yang sama.',
  },
  {
    teks: 'Biaya bensin dan parkir untuk mengantar pesanan pelanggan sebesar Rp150.000. Apakah perlu dicatat?',
    opsi: [
      'Tidak perlu, jumlahnya terlalu kecil',
      'Perlu, tapi digabung saja dengan bensin motor harian keluarga',
      'Perlu — catat Rp150.000 sebagai biaya transportasi usaha',
    ],
    jawaban: 'C',
    nominal: 150_000,
    efek: 'keluar',
    insight:
      'Biaya "receh" seperti bensin, parkir, dan pulsa adalah pembunuh laba yang paling tidak terasa. Rp150.000 tampak kecil, tapi kalau terjadi 20 kali sebulan nilainya Rp3.000.000 — dan tidak pernah masuk hitungan harga jual Anda.',
  },
  {
    teks: 'Pak Rudi mengambil Rp200.000 dari kas warung untuk membayar arisan RT. Bagaimana pencatatannya?',
    opsi: [
      'Catat sebagai prive (pengambilan pribadi) — saldo usaha berkurang Rp200.000',
      'Catat sebagai biaya promosi usaha',
      'Tidak dicatat karena arisan uangnya akan kembali',
    ],
    jawaban: 'A',
    nominal: 200_000,
    efek: 'keluar',
    insight:
      'Arisan RT adalah urusan pribadi, bukan usaha — walaupun uangnya nanti kembali ke kantong Anda, bukan ke kas usaha. Semua pengeluaran pribadi dari kas usaha dicatat sebagai prive tanpa kecuali.',
  },
  {
    teks: 'Modal bahan untuk 1 porsi bakso Rp8.000 dan dijual Rp15.000. Berapa keuntungan kotor per porsi?',
    opsi: ['Rp15.000', 'Rp8.000', 'Rp7.000'],
    jawaban: 'C',
    nominal: 0,
    efek: 'netral',
    insight:
      'Laba kotor per porsi = Harga jual − Modal bahan = Rp15.000 − Rp8.000 = Rp7.000. Ingat, ini belum dikurangi sewa, listrik, dan gaji. Banyak UMKM merasa untung besar per porsi tapi rugi di akhir bulan karena lupa biaya operasional.',
  },

  {
    teks: 'Reseller menyetorkan hasil penjualan bulan ini sebesar Rp2.800.000 secara tunai. Bagaimana pencatatannya?',
    opsi: [
      'Catat Rp2.800.000 sebagai pemasukan usaha',
      'Tidak dicatat, karena yang menjual adalah reseller',
      'Catat sebagai hutang kepada reseller',
    ],
    jawaban: 'A',
    nominal: 2_800_000,
    efek: 'masuk',
    insight:
      'Penjualan lewat reseller tetap penjualan usaha Anda. Catat pemasukannya utuh, lalu catat komisi reseller sebagai pengeluaran terpisah — supaya Anda tahu berapa biaya sebenarnya dari jalur distribusi ini.',
  },
  {
    teks: 'Membeli mesin pengaduk adonan seharga Rp1.500.000 tunai untuk dipakai produksi. Bagaimana pencatatannya?',
    opsi: [
      'Tidak dicatat karena mesin akan dipakai bertahun-tahun',
      'Catat sebagai biaya bahan baku',
      'Catat Rp1.500.000 sebagai pembelian peralatan usaha — kas berkurang',
    ],
    jawaban: 'C',
    nominal: 1_500_000,
    efek: 'keluar',
    insight:
      'Peralatan adalah aset usaha, tapi kasnya tetap berkurang hari ini. Bedakan dari bahan baku: mesin dipakai berulang bertahun-tahun, sedangkan bahan baku habis sekali pakai. Keduanya wajib dicatat.',
  },
  {
    teks: 'Bu Endah menerima pinjaman modal dari bank sebesar Rp5.000.000 masuk ke rekening usaha. Bagaimana pencatatannya?',
    opsi: [
      'Catat sebagai pendapatan usaha Rp5.000.000',
      'Catat sebagai kas masuk dari pinjaman — dan catat hutang Rp5.000.000',
      'Tidak dicatat karena uangnya harus dikembalikan',
    ],
    jawaban: 'B',
    nominal: 5_000_000,
    efek: 'masuk',
    insight:
      'Pinjaman menambah kas TAPI bukan pendapatan — ada kewajiban Rp5.000.000 yang lahir bersamaan. Ini kesalahan berbahaya: merasa usaha sedang untung besar padahal yang bertambah adalah hutang.',
  },
  {
    teks: 'Bu Wati memberi potongan harga Rp250.000 kepada pembeli grosir agar mau berlangganan. Bagaimana pencatatannya?',
    opsi: [
      'Tidak dicatat, potongan harga bukan uang keluar',
      'Catat sebagai kerugian usaha permanen',
      'Catat Rp250.000 sebagai potongan penjualan — mengurangi hasil penjualan',
    ],
    jawaban: 'C',
    nominal: 250_000,
    efek: 'keluar',
    insight:
      'Diskon memang bukan uang keluar dari laci, tapi mengurangi uang yang seharusnya masuk. Kalau diskon tidak pernah dicatat, Anda tidak akan sadar berapa banyak margin yang hilang demi mengejar pelanggan grosir.',
  },
  {
    teks: 'Membayar THR karyawan menjelang Lebaran sebesar Rp1.000.000. Termasuk apa transaksi ini?',
    opsi: [
      'Pengeluaran usaha Rp1.000.000 (biaya THR karyawan)',
      'Pengambilan pribadi (prive) karena sifatnya pemberian',
      'Tidak dicatat karena hanya setahun sekali',
    ],
    jawaban: 'A',
    nominal: 1_000_000,
    efek: 'keluar',
    insight:
      'THR adalah kewajiban kepada karyawan, jadi murni biaya usaha. Karena hanya muncul setahun sekali, biaya ini paling sering terlupakan — padahal idealnya disisihkan sedikit demi sedikit sejak awal tahun.',
  },
  {
    teks: 'Pak Tono menyimpan uang hasil jualan dan uang gaji istrinya dalam satu dompet yang sama. Apa risiko terbesarnya?',
    opsi: [
      'Tidak ada risiko, yang penting uangnya tidak hilang',
      'Hanya merepotkan saat menghitung, tapi tidak berpengaruh',
      'Tidak bisa diketahui apakah usaha benar-benar untung atau justru disubsidi uang pribadi',
    ],
    jawaban: 'C',
    nominal: 0,
    efek: 'netral',
    insight:
      'Inilah inti dari seluruh permainan ini. Kalau uang pribadi dan usaha tercampur, Anda bisa merasa usaha "jalan terus" padahal sebenarnya rugi dan terus ditambal gaji pasangan. Pisahkan dompet atau rekeningnya — ini langkah pertama dan termurah untuk membenahi keuangan UMKM.',
  },
  {
    teks: 'Modal awal usaha Rp10.000.000. Selama sebulan pemasukan Rp7.500.000 dan pengeluaran Rp4.500.000. Berapa saldo kas usaha di akhir bulan?',
    opsi: ['Rp13.000.000', 'Rp3.000.000', 'Rp22.000.000'],
    jawaban: 'A',
    nominal: 0,
    efek: 'netral',
    insight:
      'Saldo akhir = Modal awal + Pemasukan − Pengeluaran = Rp10.000.000 + Rp7.500.000 − Rp4.500.000 = Rp13.000.000. Perhatikan bedanya: laba bulan itu Rp3.000.000, tapi saldo kas Rp13.000.000. Laba dan saldo kas adalah dua angka berbeda — jangan tertukar.',
  },
]
