#pragma once

#include <QWidget>
#include <QLabel>
#include <QPushButton>
#include <QTableWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>

namespace blockbum::qt {

class OverviewPage : public QWidget {
    Q_OBJECT

public:
    explicit OverviewPage(QWidget* parent = nullptr);

signals:
    void sendCoinsClicked();
    void receiveCoinsClicked();

public slots:
    void updateBalance(double confirmed, double unconfirmed);
    void updateNodeStatus(uint64_t height, int peers);

private:
    void setupUi();

    QLabel* balance_label_{nullptr};
    QLabel* unconfirmed_label_{nullptr};
    QLabel* address_label_{nullptr};
    QLabel* height_label_{nullptr};
    QLabel* peers_label_{nullptr};
    QLabel* crypto_status_label_{nullptr};
    QTableWidget* recent_tx_table_{nullptr};
};

} // namespace blockbum::qt
