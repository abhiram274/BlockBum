#include "receivecoinsdialog.hpp"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QApplication>
#include <QClipboard>
#include <QMessageBox>

namespace blockbum::qt {

ReceiveCoinsDialog::ReceiveCoinsDialog(const QString& address, QWidget* parent)
    : QDialog(parent), address_(address) {
    setupUi();
}

void ReceiveCoinsDialog::setupUi() {
    setWindowTitle("Receive BUM Coins — BlockBum Core");
    setMinimumWidth(480);
    setStyleSheet("background-color: #0E0E14; color: #FFFFFF;");

    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(20, 20, 20, 20);
    layout->setSpacing(16);

    auto* header = new QLabel("📥 Receive BUM Address", this);
    header->setStyleSheet("color: #FFB800; font-size: 18px; font-weight: bold;");
    layout->addWidget(header);

    auto* info = new QLabel("Share this Bech32 address to receive BUM coins on the BlockBum network:", this);
    info->setStyleSheet("color: #94A3B8; font-size: 13px;");
    layout->addWidget(info);

    address_edit_ = new QLineEdit(address_, this);
    address_edit_->setReadOnly(true);
    address_edit_->setStyleSheet("background-color: #161622; color: #FFD700; border: 1px solid #3A3220; padding: 10px; font-family: monospace; font-size: 13px; border-radius: 4px;");
    layout->addWidget(address_edit_);

    auto* btn_layout = new QHBoxLayout();
    btn_layout->addStretch();

    auto* copy_btn = new QPushButton("Copy Address", this);
    connect(copy_btn, &QPushButton::clicked, this, &ReceiveCoinsDialog::copyAddress);

    auto* close_btn = new QPushButton("Close", this);
    close_btn->setObjectName("goldBtn");
    connect(close_btn, &QPushButton::clicked, this, &QDialog::accept);

    btn_layout->addWidget(copy_btn);
    btn_layout->addWidget(close_btn);

    layout->addLayout(btn_layout);
}

void ReceiveCoinsDialog::copyAddress() {
    QApplication::clipboard()->setText(address_);
    QMessageBox::information(this, "Address Copied", "Address copied to clipboard:\n" + address_);
}

} // namespace blockbum::qt
