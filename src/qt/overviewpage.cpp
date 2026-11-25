#include "overviewpage.hpp"
#include <QHeaderView>
#include <QApplication>
#include <QClipboard>
#include <QFrame>

namespace blockbum::qt {

OverviewPage::OverviewPage(QWidget* parent)
    : QWidget(parent) {
    setupUi();
}

void OverviewPage::setupUi() {
    auto* main_layout = new QVBoxLayout(this);
    main_layout->setContentsMargins(24, 24, 24, 24);
    main_layout->setSpacing(20);

    // Header Card (Balances and Gold Coin Emblem)
    auto* hero_card = new QFrame(this);
    hero_card->setStyleSheet(
        "QFrame { background-color: #12121A; border: 1px solid #3A3220; border-radius: 8px; padding: 16px; }"
    );
    auto* hero_layout = new QHBoxLayout(hero_card);

    // Left info
    auto* balance_layout = new QVBoxLayout();
    auto* title_label = new QLabel("AVAILABLE BALANCE", hero_card);
    title_label->setStyleSheet("color: #FFB800; font-size: 11px; font-weight: bold; letter-spacing: 1px;");

    balance_label_ = new QLabel("520.45000000 BUM", hero_card);
    balance_label_->setObjectName("heroBalance");
    balance_label_->setStyleSheet("color: #FFD700; font-size: 32px; font-weight: bold;");

    unconfirmed_label_ = new QLabel("Pending: 0.00000000 BUM  •  Fiat Estimate: ~$1,040.90 USD", hero_card);
    unconfirmed_label_->setStyleSheet("color: #94A3B8; font-size: 12px;");

    auto* addr_box = new QHBoxLayout();
    address_label_ = new QLabel("bb1a729e8c40b82194017de8bf019abcdef0123456", hero_card);
    address_label_->setStyleSheet("color: #E2E8F0; font-family: monospace; font-size: 12px;");

    auto* copy_btn = new QPushButton("Copy Address", hero_card);
    copy_btn->setObjectName("goldBtn");
    copy_btn->setFixedHeight(28);
    connect(copy_btn, &QPushButton::clicked, [this]() {
        QApplication::clipboard()->setText(address_label_->text());
    });

    addr_box->addWidget(address_label_);
    addr_box->addWidget(copy_btn);
    addr_box->addStretch();

    balance_layout->addWidget(title_label);
    balance_layout->addWidget(balance_label_);
    balance_layout->addWidget(unconfirmed_label_);
    balance_layout->addSpacing(8);
    balance_layout->addLayout(addr_box);

    hero_layout->addLayout(balance_layout, 3);

    // Right action buttons
    auto* actions_layout = new QVBoxLayout();
    auto* send_btn = new QPushButton("⚡ Send BUM", hero_card);
    send_btn->setFixedHeight(38);
    connect(send_btn, &QPushButton::clicked, this, &OverviewPage::sendCoinsClicked);

    auto* receive_btn = new QPushButton("📥 Receive BUM", hero_card);
    receive_btn->setObjectName("goldBtn");
    receive_btn->setFixedHeight(38);
    connect(receive_btn, &QPushButton::clicked, this, &OverviewPage::receiveCoinsClicked);

    actions_layout->addWidget(send_btn);
    actions_layout->addWidget(receive_btn);
    actions_layout->addStretch();

    hero_layout->addLayout(actions_layout, 1);
    main_layout->addWidget(hero_card);

    // System & Cryptography Banner
    auto* banner_frame = new QFrame(this);
    banner_frame->setStyleSheet(
        "QFrame { background-color: #14141E; border: 1px solid #2A2418; border-radius: 6px; padding: 10px; }"
    );
    auto* banner_layout = new QHBoxLayout(banner_frame);

    height_label_ = new QLabel("⛓ Chain Height: #1,284,590", banner_frame);
    height_label_->setStyleSheet("color: #FFFFFF; font-weight: 600;");

    peers_label_ = new QLabel("📡 Peers: 8 Connected (IPv4/IPv6)", banner_frame);
    peers_label_->setStyleSheet("color: #FFB800; font-weight: 600;");

    crypto_status_label_ = new QLabel("🔒 Ubuntu Cryptography: Monocypher Ed25519/X25519 [Active]", banner_frame);
    crypto_status_label_->setStyleSheet("color: #FF8800; font-weight: 600;");

    banner_layout->addWidget(height_label_);
    banner_layout->addWidget(peers_label_);
    banner_layout->addWidget(crypto_status_label_);
    banner_layout->addStretch();

    main_layout->addWidget(banner_frame);

    // Recent Transactions Section
    auto* tx_header_layout = new QHBoxLayout();
    auto* tx_title = new QLabel("RECENT TRANSACTIONS", this);
    tx_title->setStyleSheet("color: #FFFFFF; font-size: 15px; font-weight: bold;");
    tx_header_layout->addWidget(tx_title);
    tx_header_layout->addStretch();
    main_layout->addLayout(tx_header_layout);

    recent_tx_table_ = new QTableWidget(this);
    recent_tx_table_->setColumnCount(6);
    recent_tx_table_->setHorizontalHeaderLabels(
        QStringList() << "Status" << "Type" << "Counterparty" << "Amount (BUM)" << "Fee" << "Timestamp"
    );
    recent_tx_table_->horizontalHeader()->setSectionResizeMode(QHeaderView::Stretch);
    recent_tx_table_->setAlternatingRowColors(false);
    recent_tx_table_->setEditTriggers(QAbstractItemView::NoEditTriggers);
    recent_tx_table_->setSelectionBehavior(QAbstractItemView::SelectRows);
    recent_tx_table_->verticalHeader()->setVisible(false);

    // Sample data rows
    recent_tx_table_->setRowCount(3);
    auto set_cell = [this](int row, int col, const QString& val, const QString& color = "#FFFFFF") {
        auto* item = new QTableWidgetItem(val);
        item->setForeground(QBrush(QColor(color)));
        recent_tx_table_->setItem(row, col, item);
    };

    set_cell(0, 0, "● Confirmed", "#10B981");
    set_cell(0, 1, "Received", "#FFD700");
    set_cell(0, 2, "bb1d9812f8a429019ca5621de8821fedcba9876543", "#FFFFFF");
    set_cell(0, 3, "+50.00000000", "#10B981");
    set_cell(0, 4, "0.0001", "#94A3B8");
    set_cell(0, 5, "10 mins ago", "#94A3B8");

    set_cell(1, 0, "● Confirmed", "#10B981");
    set_cell(1, 1, "Sent", "#FF6B00");
    set_cell(1, 2, "bb1web778899aabbccddeeff00112233445566778899", "#FFFFFF");
    set_cell(1, 3, "-12.50000000", "#EF4444");
    set_cell(1, 4, "0.0002", "#94A3B8");
    set_cell(1, 5, "1 hour ago", "#94A3B8");

    set_cell(2, 0, "● Confirmed", "#10B981");
    set_cell(2, 1, "Block Reward", "#FFD700");
    set_cell(2, 2, "Coinbase (Block #1,284,588)", "#FFB800");
    set_cell(2, 3, "+50.00000000", "#10B981");
    set_cell(2, 4, "0.0000", "#94A3B8");
    set_cell(2, 5, "3 hours ago", "#94A3B8");

    main_layout->addWidget(recent_tx_table_);
}

void OverviewPage::updateBalance(double confirmed, double unconfirmed) {
    if (balance_label_) {
        balance_label_->setText(QString::asprintf("%.8f BUM", confirmed));
    }
    if (unconfirmed_label_) {
        unconfirmed_label_->setText(QString::asprintf("Pending: %.8f BUM", unconfirmed));
    }
}

void OverviewPage::updateNodeStatus(uint64_t height, int peers) {
    if (height_label_) {
        height_label_->setText(QString::asprintf("⛓ Chain Height: #%llu", static_cast<unsigned long long>(height)));
    }
    if (peers_label_) {
        peers_label_->setText(QString::asprintf("📡 Peers: %d Connected (IPv4/IPv6)", peers));
    }
}

} // namespace blockbum::qt
